import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Event from './models/Event.js';
import Order from './models/Order.js';
import Feedback from './models/Feedback.js';
import Support from './models/Support.js';

export default async function runSeed() {
  console.log('Resetting collections...');
  await Promise.all([User.deleteMany(), Event.deleteMany(), Order.deleteMany(), Feedback.deleteMany(), Support.deleteMany()]);

  const admin = await User.create({ name: 'Site Admin', email: 'admin@convene.test', password: 'Admin@1234', role: 'admin' });
  const organizer = await User.create({ name: 'Olivia Organizer', email: 'organizer@convene.test', password: 'Organizer@1234', role: 'organizer', bio: 'Community events since 2018.' });
  await User.create({ name: 'Uma User', email: 'user@convene.test', password: 'User@12345', role: 'user' });

  const day = 24 * 60 * 60 * 1000;
  const at = (d, h, m = 0) => { const x = new Date(Date.now() + d * day); x.setHours(h, m, 0, 0); return x; };
  const img = (s) => `https://picsum.photos/seed/${s}/1200/700`;
  const long = (t) => `${t}\n\nJoin us for a day of meaningful conversations, hands-on sessions and time to meet the people building what comes next. Doors open one hour before the first session, and refreshments are included with every ticket.`;

  const events = [
    {
      title: 'DevSummit Chennai 2026', category: 'Technology', city: 'Chennai', venue: 'Trade Centre Auditorium', address: 'Nandambakkam, Chennai',
      description: long('A one-day conference on web platforms, cloud and applied AI with talks from engineers who ship.'),
      images: [img('devsummit1'), img('devsummit2'), img('devsummit3')], videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      startDate: at(21, 9), endDate: at(21, 18),
      ticketTypes: [{ name: 'General admission', description: 'All talks + lunch', price: 25, quantity: 200 }, { name: 'VIP', description: 'Front rows, workshop seat, speaker dinner', price: 90, quantity: 40 }],
      schedule: [
        { title: 'Registration & coffee', startTime: at(21, 9), endTime: at(21, 10), room: 'Lobby' },
        { title: 'Keynote: The next decade of the web', speaker: 'Ananya Rao', speakerRole: 'Principal Engineer', startTime: at(21, 10), endTime: at(21, 11), room: 'Main hall' },
        { title: 'Workshop: Building with MERN', speaker: 'Karthik S', speakerRole: 'Staff Engineer', startTime: at(21, 11, 30), endTime: at(21, 13), room: 'Hall B' },
        { title: 'Panel: AI in production', speaker: 'Various', startTime: at(21, 14), endTime: at(21, 15, 30), room: 'Main hall' },
      ],
    },
    {
      title: 'Sunset Jazz on the Terrace', category: 'Music', city: 'Bengaluru', venue: 'Skyline Terrace', address: 'Indiranagar, Bengaluru',
      description: long('An evening of live jazz quartets, small plates and golden-hour views.'),
      images: [img('jazz1'), img('jazz2')], startDate: at(10, 18), endDate: at(10, 22),
      ticketTypes: [{ name: 'Standing', price: 12, quantity: 120 }, { name: 'Table for two', price: 60, quantity: 20 }],
      schedule: [{ title: 'Doors open', startTime: at(10, 18), endTime: at(10, 19) }, { title: 'The Marina Quartet', speaker: 'Marina Devi', startTime: at(10, 19), endTime: at(10, 21) }],
    },
    {
      title: 'Startup Founders Breakfast', category: 'Business', city: 'Mumbai', venue: 'Bay Cafe', description: long('Small-group breakfast for early stage founders to swap notes on fundraising and hiring.'),
      images: [img('founders1')], startDate: at(5, 8), endDate: at(5, 10), ticketTypes: [{ name: 'Seat', price: 0, quantity: 30 }],
    },
    {
      title: 'Sunrise Yoga & Wellness Retreat', category: 'Health & Wellness', city: 'Pondicherry', venue: 'Seaside Retreat', description: long('A weekend reset with guided yoga, breathwork and healthy food by the sea.'),
      images: [img('yoga1'), img('yoga2')], startDate: at(35, 6), endDate: at(36, 17), ticketTypes: [{ name: 'Shared room', price: 120, quantity: 24 }, { name: 'Private room', price: 210, quantity: 8 }],
    },
    {
      title: 'Street Food Festival', category: 'Food & Drink', city: 'Chennai', venue: 'Marina Grounds', description: long('Sixty vendors, one long evening. Bring friends and an appetite.'),
      images: [img('food1'), img('food2')], startDate: at(14, 16), endDate: at(14, 23), ticketTypes: [{ name: 'Entry', price: 5, quantity: 500 }, { name: 'Tasting pass (10 tokens)', price: 18, quantity: 150 }],
    },
    {
      title: 'Watercolour Workshop for Beginners', category: 'Arts & Culture', city: 'Chennai', venue: 'Studio 9', description: long('Learn washes, gradients and layering in a relaxed three-hour class. Materials provided.'),
      images: [img('art1')], startDate: at(8, 15), endDate: at(8, 18), ticketTypes: [{ name: 'Workshop seat', price: 30, quantity: 16 }],
    },
  ];
  await Event.create(events.map((e) => ({ ...e, organizer: organizer._id, status: 'approved' })));
  await Event.create({ title: 'Marathon Training Meetup (awaiting approval)', category: 'Sports & Fitness', city: 'Chennai', venue: "Elliot's Beach", description: long('Weekly group run with pacers for every level.'), images: [img('run1')], startDate: at(12, 6), endDate: at(12, 8), ticketTypes: [{ name: 'Runner', price: 0, quantity: 60 }], organizer: organizer._id, status: 'pending' });

  console.log('\nSeeded. Demo accounts:\n  admin      admin@convene.test / Admin@1234\n  organizer  organizer@convene.test / Organizer@1234\n  attendee   user@convene.test / User@12345\n');
}

// Only run automatically when this file is executed directly (`npm run seed`),
// not when it's imported by server.js for the in-memory auto-seed.
const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  await connectDB();
  await runSeed();
  await mongoose.disconnect();
}