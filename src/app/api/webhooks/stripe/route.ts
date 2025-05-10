import prisma from "@/db/prisma";
import {stripe} from "@/lib/stripe";
import Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err:any) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return new Response("Webhook Error", {status: 400});        

    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                console.log("checkout.session.completed event received");
                const session = await stripe.checkout.sessions.retrieve(
                    ( event.data.object as Stripe.Checkout.Session).id,
                    {expand: ["line_items"]},);

                const customerId = session.customer as string;
                const customerDetails =  session.customer_details;

                if (customerDetails?.email) {
                    console.log("Customer email:", customerDetails.email);
                    const user = await prisma.user.findUnique({
                        where: { email: customerDetails.email },
                    });
                    if (!user) throw new Error("User not found");
                    console.log("User found:", user);
                    if (!user.customerId) {
                        // setting stripe customer id in the user table if doesn't exist 
                        await prisma.user.update({
                            where: {id: user.id},
                            data: { customerId } 
                        });
                        console.log("Customer ID updated in user table:", customerId);
                    }
                    const lineItems = session.line_items?.data || [];
                    for (const item of lineItems) {
                        const priceId = item.price?.id;
                        const isSubscription = item.price?.type === "recurring";
                         if (isSubscription) {
                            let endDate = new Date();
                            if (priceId === process.env.STRIPE_YEARLY_PRICE_ID!) {
                                endDate.setFullYear(endDate.getFullYear() + 1);
                            } else if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID!) {
                                endDate.setMonth(endDate.getMonth() + 1);
                            } else {
                                throw new Error("Invalid price ID");
                            }
                            await prisma.subscription.upsert({
                                where: { userId: user.id! },
                                create: {
                                    userId: user.id,
                                    startDate: new Date(),
                                    endDate: endDate,
                                    plan: "premium",
                                    period: priceId === process.env.STRIPE_YEARLY_PRICE_ID! ? "yearly" : "monthly",
                                },
                                update: {
                                    startDate: new Date(),
                                    endDate: endDate,
                                    plan: "premium",
                                    period: priceId === process.env.STRIPE_YEARLY_PRICE_ID! ? "yearly" : "monthly",
                                },
                            });
                            console.log("Subscription upserted:");
    
                            await prisma.user.update({
                                where: { id: user.id! },
                                data: { plan: "premium" },
                            });
                            console.log("User plan updated to premium:", user.id);
                        }       
                    }
                }       
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = await stripe.subscriptions.retrieve(
                    (event.data.object as Stripe.Subscription).id);
                const user = await prisma.user.findUnique({
                    where: { customerId: subscription.customer as string }});
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { plan: "free" },
                    });
                    console.log("Subscription deleted for user:", user.id);
                } else {
                    console.error("Unable to delete. User not found for subscription:", subscription.id);
                    throw new Error("User not found for the subscription deleted event  ");
                    
                }
                break;
            }
            default:
                //console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err) {
        console.error(`⚠️  Webhook handler failed.`, err);
        return new Response("Webhook Error", {status: 400}); 
    }
    return new Response("Webhook received", {status: 200}); 

}