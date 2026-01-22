import { inngest } from "../client";
import { getServiceSupabase } from "@/lib/supabase";

export const reindexAll = inngest.createFunction(
    { id: "reindex-all-entities" },
    { event: "reindex.all" },
    async ({ step }) => {
        const supabase = getServiceSupabase();

        // 1. Reindex Events
        const { data: events, error } = await step.run("fetch-all-events", async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'published');

            if (error) throw error;
            return { data, error };
        });

        if (!events) return { success: false, message: "No events found" };

        // Process in batches of 50
        const batchSize = 50;
        for (let i = 0; i < events.length; i += batchSize) {
            await step.run(`index-events-batch-${i}`, async () => {
                const batch = events.slice(i, i + batchSize);

                const searchRecords = batch.map(event => ({
                    entity_id: event.id,
                    entity_type: 'event',
                    title: event.title,
                    subtitle: new Date(event.date).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                    }),
                    url: `/events/${event.id}`,
                    icon: 'Calendar',
                    keywords: [event.location, event.city, event.organizer_name].filter(Boolean),
                    metadata: {
                        date: event.date,
                        cover_image: event.cover_image,
                        location: event.location,
                        city: event.city
                    },
                    // let trigger handle updated_at and fts
                }));

                const { error: upsertError } = await supabase
                    .from('search_index')
                    .upsert(searchRecords, { onConflict: 'entity_id,entity_type' });

                if (upsertError) throw new Error(upsertError.message);

                return { indexed: batch.length };
            });
        }

        // 2. Future: Reindex Calendars, Users, etc.

        return { success: true, totalEvents: events.length };
    }
);
