import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedServiceAvailability() {
  try {
    console.log('🌱 Seeding service availability...');

    // Get all services
    const services = await prisma.service.findMany({
      where: { isActive: true },
    });

    if (services.length === 0) {
      console.log('❌ No services found. Please run the main seed first.');
      return;
    }

    // Clear existing service availability
    await prisma.serviceAvailability.deleteMany({});
    console.log('🧹 Cleared existing service availability');

    // Create availability for each service
    for (const service of services) {
      // Monday to Friday (1-5), 9 AM to 6 PM
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        // Morning session: 9:00 - 12:00
        await prisma.serviceAvailability.create({
          data: {
            serviceId: service.id,
            dayOfWeek: dayOfWeek,
            startTime: '09:00',
            endTime: '12:00',
            isActive: true,
          },
        });

        // Afternoon session: 14:00 - 18:00 (2 PM - 6 PM)
        await prisma.serviceAvailability.create({
          data: {
            serviceId: service.id,
            dayOfWeek: dayOfWeek,
            startTime: '14:00',
            endTime: '18:00',
            isActive: true,
          },
        });
      }

      // Saturday (6): Limited hours 10:00 - 16:00
      await prisma.serviceAvailability.create({
        data: {
          serviceId: service.id,
          dayOfWeek: 6,
          startTime: '10:00',
          endTime: '16:00',
          isActive: true,
        },
      });

      console.log(`✅ Created availability for service: ${service.name}`);
    }

    console.log('🎉 Service availability seeding completed!');
    console.log(`📊 Created availability for ${services.length} services`);
    
    // Show summary
    const totalAvailability = await prisma.serviceAvailability.count();
    console.log(`📈 Total service availability records: ${totalAvailability}`);

  } catch (error) {
    console.error('❌ Error seeding service availability:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedServiceAvailability().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seedServiceAvailability };