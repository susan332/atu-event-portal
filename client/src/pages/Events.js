import { useState, useEffect } from 'react';
import { getEvents, registerForEvent } from '../services/events';
import EventCard from '../components/Events/EventCard';

const EventsPage = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const handleRegister = async (eventId) => {
    try {
      if (!user) {
        alert('Please login to register for events');
        return;
      }
      
      await registerForEvent(eventId);
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, attendees: [...event.attendees, user.id] } 
          : event
      ));
      alert('Successfully registered for the event!');
    } catch (err) {
      alert(err.response?.data || 'Failed to register for event');
    }
  };

  if (loading) return <div className="text-center py-8">Loading events...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <EventCard 
            key={event.id} 
            event={event} 
            user={user}
            onRegister={handleRegister}
          />
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
