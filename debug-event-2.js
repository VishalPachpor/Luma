const url = 'https://wgphpdjarabesuvgxpoc.supabase.co/rest/v1/events?id=eq.7030ca5e-677f-405a-b5d0-b7023ace3f76&select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncGhwZGphcmFiZXN1dmd4cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTM3NjcsImV4cCI6MjA4Mzk4OTc2N30.uLAH2LaG9VGLwHRcFB9r5WVtlV9GXs4m11jlZ83gZEc';

fetch(url, {
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
})
    .then(res => res.json())
    .then(data => {
        if (data[0]) {
            console.log('Registration Questions:', JSON.stringify(data[0].registration_questions, null, 2));
        } else {
            console.log('Event not found');
        }
    })
    .catch(err => console.error(err));
