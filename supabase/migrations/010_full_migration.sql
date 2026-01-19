-- =====================================================
-- SUPABASE FULL MIGRATION
-- Migrates from Firebase to Supabase-only architecture
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    twitter_handle TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 2. EVENTS TABLE (full schema)
-- =====================================================
DROP TABLE IF EXISTS events CASCADE;
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location TEXT,
    city TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    cover_image TEXT,
    
    -- Organizer
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organizer_name TEXT,
    calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
    
    -- Settings
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    require_approval BOOLEAN DEFAULT FALSE,
    capacity INTEGER,
    
    -- Commerce
    price DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    
    -- Metadata (flexible JSON for rich content)
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Registration Questions (JSON array)
    registration_questions JSONB DEFAULT '[]',
    
    -- Rich Content
    social_links JSONB DEFAULT '{}',
    agenda JSONB DEFAULT '[]',
    hosts JSONB DEFAULT '[]',
    who_should_attend TEXT[] DEFAULT '{}',
    event_format JSONB DEFAULT '[]',
    presented_by TEXT,
    about TEXT[] DEFAULT '{}',
    
    -- Counts (denormalized for performance)
    attendee_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_title_search ON events USING gin(title gin_trgm_ops);

-- =====================================================
-- 3. TICKET TIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    ticket_type TEXT DEFAULT 'free' CHECK (ticket_type IN ('free', 'stripe', 'crypto')),
    inventory INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    max_per_order INTEGER DEFAULT 10,
    sales_start TIMESTAMPTZ,
    sales_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);

-- =====================================================
-- 4. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL,
    
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'failed', 'refunded')),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,
    
    -- Payment Details
    payment_provider TEXT CHECK (payment_provider IN ('stripe', 'crypto', 'free')),
    payment_intent_id TEXT,
    tx_hash TEXT,
    wallet_address TEXT,
    
    -- Idempotency
    idempotency_key TEXT UNIQUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE UNIQUE INDEX idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- =====================================================
-- 5. GUESTS TABLE (replaces Firestore guests)
-- =====================================================
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Security
    qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT DEFAULT 'issued' CHECK (status IN ('pending', 'pending_approval', 'approved', 'issued', 'scanned', 'revoked', 'rejected')),
    
    -- Approval Metadata
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Check-in
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES profiles(id),
    
    -- Registration Responses (JSON)
    registration_responses JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one guest per user per event
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_guests_event ON guests(event_id);
CREATE INDEX idx_guests_user ON guests(user_id);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_guests_qr ON guests(qr_token);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read all, update own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

-- EVENTS: Public read, organizer write
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT USING (
    status = 'published' OR organizer_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events"
ON events FOR INSERT WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can update own events" ON events;
CREATE POLICY "Organizers can update own events"
ON events FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own events" ON events;
CREATE POLICY "Organizers can delete own events"
ON events FOR DELETE USING (auth.uid() = organizer_id);

-- TICKET TIERS: Public read, organizer write
DROP POLICY IF EXISTS "Ticket tiers are viewable" ON ticket_tiers;
CREATE POLICY "Ticket tiers are viewable"
ON ticket_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can manage ticket tiers" ON ticket_tiers;
CREATE POLICY "Organizers can manage ticket tiers"
ON ticket_tiers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM events WHERE events.id = ticket_tiers.event_id AND events.organizer_id = auth.uid()
    )
);

-- ORDERS: User reads own
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GUESTS: User reads own, organizer reads all for event
DROP POLICY IF EXISTS "Users can view own guest records" ON guests;
CREATE POLICY "Users can view own guest records"
ON guests FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.organizer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create guest records" ON guests;
CREATE POLICY "Users can create guest records"
ON guests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can update guests" ON guests;
CREATE POLICY "Organizers can update guests"
ON guests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.organizer_id = auth.uid()
    )
);

-- =====================================================
-- 7. FUNCTIONS
-- =====================================================

-- Function to increment attendee count
CREATE OR REPLACE FUNCTION increment_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('issued', 'approved') AND (OLD IS NULL OR OLD.status NOT IN ('issued', 'approved')) THEN
        UPDATE events SET attendee_count = attendee_count + 1, updated_at = NOW()
        WHERE id = NEW.event_id;
    ELSIF OLD.status IN ('issued', 'approved') AND NEW.status NOT IN ('issued', 'approved') THEN
        UPDATE events SET attendee_count = GREATEST(attendee_count - 1, 0), updated_at = NOW()
        WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_guest_status_change ON guests;
CREATE TRIGGER on_guest_status_change
    AFTER INSERT OR UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION increment_attendee_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 8. ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE guests;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
