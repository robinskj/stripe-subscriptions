"use server";

// called from auth/callback/page.tsx to
// determine whether to add the user to the database

// Prisma client, npm install @prisma/client if not available
import prisma from "@/db/prisma"; // installs during npx prisma db push
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";    

export async function checkAuthStatus() {

    const { getUser } = await getKindeServerSession(); // returns a function to get user from session
    const user = await getUser();
    if (!user) {  // Not authenticated
        return { success: false} ;
    }
    
    // checks for user in the database by matching
    // session user id with the db User table id field
    // see schema.prisma for User model
    const existingUser = await prisma.user.findUnique({
        where: {
            id: user.id,
        },
    });
    if (!existingUser) {  // User does not exist in the database
        // signup user in postgres database
        await prisma.user.create({
            data: {
                id: user.id,
                email: user.email!,
                name: user.given_name + ' ' + user.family_name,
            }
        });
    }
    return { success: true } ;

}
