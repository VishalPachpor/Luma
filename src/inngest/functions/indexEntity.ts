import { inngest } from "../client";
import { getServiceSupabase } from "@/lib/supabase";

export const indexEvent = inngest.createFunction(
    { id: "index-event" },
    { event: "event.created" },
    async ({ event, step }) => {
        const { event: eventData } = event.data;

        await step.run("upsert-search-index", async () => {
            const supabase = getServiceSupabase();

            const keywords = [
                eventData.location,
                eventData.city,
                eventData.organizer_name
            ].filter(Boolean) as string[];

            const { error } = await supabase
                .from('search_index')
                .upsert({
                    entity_id: eventData.id,
                    entity_type: 'event',
                    title: eventData.title,
                    subtitle: new Date(eventData.date).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                    }),
                    url: `/events/${eventData.id}`,
                    // Try to map category or other icon if available, else default in UI
                    icon: 'Calendar',
                    keywords,
                    metadata: {
                        date: eventData.date,
                        cover_image: eventData.cover_image,
                        location: eventData.location
                    },
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'entity_id,entity_type'
                });

            if (error) {
                throw new Error(`Failed to index event: ${error.message}`);
            }

            return { success: true, id: eventData.id };
        });
    }
);

export const indexEventUpdate = inngest.createFunction(
    { id: "index-event-update" },
    { event: "event.updated" },
    async ({ event, step }) => {
        const { event: eventData } = event.data;

        await step.run("upsert-search-index-update", async () => {
            const supabase = getServiceSupabase();

            const keywords = [
                eventData.location,
                eventData.city,
                eventData.organizer_name
            ].filter(Boolean) as string[];

            const { error } = await supabase
                .from('search_index')
                .upsert({
                    entity_id: eventData.id,
                    entity_type: 'event',
                    title: eventData.title,
                    subtitle: new Date(eventData.date).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                    }),
                    url: `/events/${eventData.id}`,
                    icon: 'Calendar',
                    keywords,
                    metadata: {
                        date: eventData.date,
                        cover_image: eventData.cover_image,
                        location: eventData.location
                    },
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'entity_id,entity_type'
                });

            if (error) {
                throw new Error(`Failed to update index: ${error.message}`);
            }
        });
    }
);
