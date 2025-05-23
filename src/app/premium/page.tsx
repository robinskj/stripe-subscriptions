"use server"
import prisma from "@/db/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const Page = async () => {
	const {getUser} = getKindeServerSession();
	const user = await getUser();
	if (!user) return redirect('/');

	const userProfile = await prisma.user.findUnique({ where : {id: user.id}});
	if (userProfile?.plan === 'free') {
		return redirect('/'); // Redirect to home page if user is not premium
	} 
	return <div className='max-w-7xl mx-auto'>This page is only visible to premium users</div>;
	
};
export default Page;
