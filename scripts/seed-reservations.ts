import { db } from "../server/db";
import { reservations } from "../shared/schema";
import { addDays, addHours, setHours, setMinutes } from "date-fns";

async function seedReservations() {
  console.log("📅 Starting reservation seed...");

  try {
    // Clear existing reservations
    await db.delete(reservations);
    console.log("🗑️  Cleared existing reservations");

    const today = new Date();
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);
    const nextWeek = addDays(today, 7);

    // Create sample reservations
    const sampleReservations = [
      // Today's reservations
      {
        customerName: "John Doe",
        phoneNumber: "081234567890",
        guestCount: 4,
        reservationDate: setMinutes(setHours(today, 10), 0),
        reservationTime: "10:00",
        status: "confirmed" as const,
        notes: "Window seat preferred"
      },
      {
        customerName: "Jane Smith",
        phoneNumber: "081234567891",
        guestCount: 2,
        reservationDate: setMinutes(setHours(today, 12), 0),
        reservationTime: "12:00",
        status: "pending" as const,
        notes: "Anniversary dinner"
      },
      {
        customerName: "Michael Brown",
        phoneNumber: "081234567892",
        guestCount: 6,
        reservationDate: setMinutes(setHours(today, 18), 0),
        reservationTime: "18:00",
        status: "confirmed" as const,
        notes: "Birthday celebration"
      },
      {
        customerName: "Sarah Johnson",
        phoneNumber: "081234567893",
        guestCount: 3,
        reservationDate: setMinutes(setHours(today, 19), 0),
        reservationTime: "19:00",
        status: "pending" as const,
        notes: null
      },

      // Tomorrow's reservations
      {
        customerName: "David Lee",
        phoneNumber: "081234567894",
        guestCount: 5,
        reservationDate: setMinutes(setHours(tomorrow, 11), 0),
        reservationTime: "11:00",
        status: "confirmed" as const,
        notes: "Business lunch"
      },
      {
        customerName: "Emily Chen",
        phoneNumber: "081234567895",
        guestCount: 2,
        reservationDate: setMinutes(setHours(tomorrow, 13), 0),
        reservationTime: "13:00",
        status: "pending" as const,
        notes: "Vegetarian meals required"
      },
      {
        customerName: "Robert Wilson",
        phoneNumber: "081234567896",
        guestCount: 4,
        reservationDate: setMinutes(setHours(tomorrow, 19), 30),
        reservationTime: "19:30",
        status: "confirmed" as const,
        notes: null
      },

      // Day after tomorrow
      {
        customerName: "Lisa Anderson",
        phoneNumber: "081234567897",
        guestCount: 8,
        reservationDate: setMinutes(setHours(dayAfterTomorrow, 17), 0),
        reservationTime: "17:00",
        status: "pending" as const,
        notes: "Large group - need private area"
      },
      {
        customerName: "Thomas Garcia",
        phoneNumber: "081234567898",
        guestCount: 2,
        reservationDate: setMinutes(setHours(dayAfterTomorrow, 20), 0),
        reservationTime: "20:00",
        status: "confirmed" as const,
        notes: "Romantic dinner"
      },

      // Next week
      {
        customerName: "Patricia Martinez",
        phoneNumber: "081234567899",
        guestCount: 10,
        reservationDate: setMinutes(setHours(nextWeek, 18), 0),
        reservationTime: "18:00",
        status: "pending" as const,
        notes: "Company team dinner"
      },
      {
        customerName: "Christopher Davis",
        phoneNumber: "081234567800",
        guestCount: 4,
        reservationDate: setMinutes(setHours(nextWeek, 19), 0),
        reservationTime: "19:00",
        status: "confirmed" as const,
        notes: null
      },

      // Past reservations (completed/cancelled)
      {
        customerName: "Jessica Taylor",
        phoneNumber: "081234567801",
        guestCount: 3,
        reservationDate: addDays(today, -1),
        reservationTime: "18:00",
        status: "completed" as const,
        notes: "Great experience!"
      },
      {
        customerName: "Daniel White",
        phoneNumber: "081234567802",
        guestCount: 2,
        reservationDate: addDays(today, -2),
        reservationTime: "12:00",
        status: "cancelled" as const,
        notes: "Customer cancelled due to illness"
      }
    ];

    for (const reservation of sampleReservations) {
      await db.insert(reservations).values(reservation);
      console.log(`✅ Created reservation for ${reservation.customerName}`);
    }

    console.log("🎉 Reservation seed completed successfully!");
    console.log(`📊 Total reservations created: ${sampleReservations.length}`);

    // Verification
    const count = await db.select().from(reservations);
    console.log(`\n📊 Verification:`);
    console.log(`Total reservations in database: ${count.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding reservations:", error);
    process.exit(1);
  }
}

seedReservations();
