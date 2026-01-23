DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;

CREATE POLICY "Events are viewable by everyone"
ON events FOR SELECT USING (
    status IN ('published', 'live', 'ended') OR organizer_id = auth.uid()
);
