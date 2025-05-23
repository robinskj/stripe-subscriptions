
"use client"

// called after Kinde login
// controlled by KINDE_POST_LOGIN_REDIRECT_URL in .env 
import { Loader } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { checkAuthStatus } from "./actions"; // server action
import { useEffect } from "react";


const Page = () => {
    const router = useRouter();
    const {user} = useKindeBrowserClient();
    const { data} = useQuery({
        queryKey: ["checkAuthStatus"],
        queryFn: async () => await checkAuthStatus()
    });
    
    useEffect (() => {
        const stripePaymentLink = localStorage.getItem("stripePaymentLink");
        if (data?.success && stripePaymentLink && user?.email) {
            localStorage.removeItem("stripePaymentLink");
            router.push(`${stripePaymentLink}?prefilled_email=${user?.email}`);
        } else if (data?.success === false) {
            router.push('/'); // redirect to home page
        }
    }, [router, data, user]);

    if (data?.success) {
        router.push('/'); // redirect to home page
    }
  return (
    <div className="mt-20 w-full flex justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader className='w-10 h-10 animate-spin text-primary'/>
            <h3>Redirecting...</h3>
            <p>Please wait...</p>
        </div>
    </div>
  );
}
export default Page;