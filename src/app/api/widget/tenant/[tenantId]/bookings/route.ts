import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, getNotificationMessages } from "@/lib/notifications";
import { NotificationType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    const {
      serviceId,
      professionalId,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = body;

    // Validar campos requeridos
    if (!serviceId || !date || !time || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el servicio pertenece al tenant
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId: tenantId,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Servicio no encontrado" },
        { status: 404 }
      );
    }

    // Si se especifica un profesional, verificar que pertenece al tenant
    if (professionalId && professionalId !== "any") {
      const professional = await prisma.professional.findFirst({
        where: {
          id: professionalId,
          tenantId: tenantId,
          isAvailable: true,
        },
      });

      if (!professional) {
        return NextResponse.json(
          { error: "Profesional no encontrado" },
          { status: 404 }
        );
      }
    }

    // Buscar o crear el usuario/cliente
    let client = await prisma.user.findUnique({
      where: { email: customerEmail },
    });

    if (!client) {
      client = await prisma.user.create({
        data: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          role: "CLIENT",
          tenantId: tenantId,
        },
      });
    }

    // Parsear la fecha y hora
    // Usar parseISO o crear la fecha manualmente para evitar problemas de zona horaria
    const [year, month, day] = date.split("-").map(Number);
    const bookingDate = new Date(year, month - 1, day); // month is 0-indexed
    
    const [timeRange] = time.split(" - ");
    const [hours, minutes] = timeRange.split(":").map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + service.duration);

    // Crear la reserva
    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        professionalId: professionalId !== "any" ? professionalId : null,
        serviceId: serviceId,
        tenantId: tenantId,
        startDateTime,
        endDateTime,
        totalPrice: service.price,
        notes: notes || "",
        status: "PENDING",
      },
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
          },
        },
        professional: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        client: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Crear notificación para el tenant (non-blocking)
    const { title, message } = getNotificationMessages(
      NotificationType.NEW_BOOKING,
      client.name || client.email,
      service.name,
      startDateTime
    );

    createNotification({
      tenantId,
      bookingId: booking.id,
      type: NotificationType.NEW_BOOKING,
      title,
      message,
    }).catch(error => {
      console.error("Error creating notification:", error);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
        service: booking.service,
        professional: booking.professional?.user,
        client: booking.client,
        totalPrice: booking.totalPrice,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error("Error creating booking for widget:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
