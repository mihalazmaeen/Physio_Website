import { NextRequest } from 'next/server';
import connectDB from '@/lib/config/database';
import { verifyAuth, unauthorizedResponse } from '@/lib/utils/auth';
import TeamMember from '@/lib/models/TeamMember';
import Blog from '@/lib/models/Blog';
import Testimonial from '@/lib/models/Testimonial';
import Service from '@/lib/models/Service';
import Appointment from '@/lib/models/Appointment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const authUser = verifyAuth(request);
        if (!authUser) return unauthorizedResponse();

        const [
            teamCount,
            blogCount,
            testimonialCount,
            serviceCount,
            appointmentCount,
            pendingAppointments,
            recentAppointments
        ] = await Promise.all([
            TeamMember.countDocuments(),
            Blog.countDocuments(),
            Testimonial.countDocuments(),
            Service.countDocuments(),
            Appointment.countDocuments(),
            Appointment.countDocuments({ status: 'pending' }),
            Appointment.find().sort({ createdAt: -1 }).limit(5)
        ]);

        return Response.json({
            stats: {
                teamMembers: teamCount,
                blogs: blogCount,
                testimonials: testimonialCount,
                services: serviceCount,
                appointments: appointmentCount,
                pendingAppointments,
            },
            recentAppointments,
        });
    } catch (error: any) {
        return Response.json({ message: 'Error fetching dashboard stats', error: error.message }, { status: 500 });
    }
}
