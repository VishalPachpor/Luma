/**
 * Home Page
 * Next.js App Router - Discovery page (Server Component)
 */

import * as eventRepo from '@/lib/repositories/event.repository';
import * as categoryRepo from '@/lib/repositories/category.repository';
import * as cityRepo from '@/lib/repositories/city.repository';
import MainContent from './MainContent';

export default async function HomePage() {
    // Fetch data using repositories
    const [events, categories, featuredCalendars, cities] = await Promise.all([
        eventRepo.findAll(),
        categoryRepo.findAllCategories(),
        categoryRepo.findAllFeaturedCalendars(),
        cityRepo.findAllCitiesWithCounts(),
    ]);

    return (
        <MainContent
            events={events}
            categories={categories}
            featuredCalendars={featuredCalendars}
            cities={cities}
        />
    );
}
