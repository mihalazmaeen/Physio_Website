import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/config/database';
import { verifyAuth, unauthorizedResponse } from '@/lib/utils/auth';
import TeamMember from '@/lib/models/TeamMember';
import Blog from '@/lib/models/Blog';
import BlogCategory from '@/lib/models/BlogCategory';
import Testimonial from '@/lib/models/Testimonial';
import Service from '@/lib/models/Service';
import ServiceCategory from '@/lib/models/ServiceCategory';
import Appointment from '@/lib/models/Appointment';
import FAQ from '@/lib/models/FAQ';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const authUser = verifyAuth(request);
        if (!authUser) return unauthorizedResponse();

        // 1. Appointments Stats
        const appointmentsPromise = Promise.all([
            Appointment.countDocuments(),
            Appointment.countDocuments({ status: 'pending' }),
            Appointment.countDocuments({ status: 'confirmed' }),
            Appointment.countDocuments({ status: 'completed' }),
            Appointment.countDocuments({ status: 'cancelled' }),
            Appointment.countDocuments({ urgency: 'urgent' }),
            Appointment.countDocuments({ urgency: 'emergency' }),
            Appointment.aggregate([
                { $group: { _id: "$appointmentType", count: { $sum: 1 } } }
            ]),
            Appointment.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('firstName lastName service preferredDate urgency status'),
            Appointment.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } },
                { $limit: 7 }
            ])
        ]);

        // 2. Blogs Stats
        const blogsPromise = Promise.all([
            Blog.countDocuments(),
            // Blog doesn't have published field, assuming all are published
            Blog.countDocuments(), // published (same as total)
            0, // unpublished
            BlogCategory.countDocuments(),
            Blog.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('category', 'name')
                .select('title category author createdAt')
        ]);

        // 3. Services Stats
        const servicesPromise = Promise.all([
            Service.countDocuments(),
            Service.countDocuments({ published: true }),
            Service.countDocuments({ published: false }),
            ServiceCategory.countDocuments(),
            // Mock or calculate popular services based on appointments
            Appointment.aggregate([
                { $group: { _id: "$service", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
        ]);

        // 4. Team Stats
        const teamPromise = TeamMember.countDocuments();

        // 5. Testimonials Stats
        const testimonialsPromise = Promise.all([
            Testimonial.countDocuments(),
            Testimonial.countDocuments({ published: true }),
            Testimonial.countDocuments({ published: false }),
            Testimonial.aggregate([
                { $match: { published: true } },
                { $group: { _id: null, avgRating: { $avg: "$rating" } } }
            ])
        ]);

        // 6. FAQs Stats
        const faqsPromise = Promise.all([
            FAQ.countDocuments(),
            FAQ.countDocuments({ published: true }),
            FAQ.countDocuments({ published: false })
        ]);

        // 7. Users Stats
        const usersPromise = User.countDocuments();

        const [
            [
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                completedAppointments,
                cancelledAppointments,
                urgentAppointments,
                emergencyAppointments,
                appointmentsByType,
                recentAppointments,
                appointmentTrend
            ],
            [
                totalBlogs,
                publishedBlogs,
                unpublishedBlogs,
                totalBlogCategories,
                recentBlogs
            ],
            [
                totalServices,
                publishedServices,
                unpublishedServices,
                totalServiceCategories,
                popularServices
            ],
            totalTeam,
            [
                totalTestimonials,
                publishedTestimonials,
                unpublishedTestimonials,
                testimonialRating
            ],
            [
                totalFaqs,
                publishedFaqs,
                unpublishedFaqs
            ],
            totalUsers
        ] = await Promise.all([
            appointmentsPromise,
            blogsPromise,
            servicesPromise,
            teamPromise,
            testimonialsPromise,
            faqsPromise,
            usersPromise
        ]);

        const stats = {
            appointments: {
                total: totalAppointments,
                pending: pendingAppointments,
                confirmed: confirmedAppointments,
                completed: completedAppointments,
                cancelled: cancelledAppointments,
                urgent: urgentAppointments,
                emergency: emergencyAppointments,
                byType: appointmentsByType,
                recent: recentAppointments,
                trend: appointmentTrend.reverse() // Make it chronological
            },
            blogs: {
                total: totalBlogs,
                published: publishedBlogs,
                unpublished: unpublishedBlogs,
                categories: totalBlogCategories,
                recent: recentBlogs
            },
            services: {
                total: totalServices,
                published: publishedServices,
                unpublished: unpublishedServices,
                categories: totalServiceCategories,
                popular: popularServices
            },
            team: {
                total: totalTeam
            },
            testimonials: {
                total: totalTestimonials,
                published: publishedTestimonials,
                unpublished: unpublishedTestimonials,
                averageRating: testimonialRating[0]?.avgRating?.toFixed(1) || "0.0"
            },
            faqs: {
                total: totalFaqs,
                published: publishedFaqs,
                unpublished: unpublishedFaqs
            },
            users: {
                total: totalUsers
            }
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json(
            { message: 'Error fetching dashboard stats', error: error.message },
            { status: 500 }
        );
    }
}
