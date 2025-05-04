
"use client"

// called after Kinde login
// controlled by KINDE_POST_LOGIN_REDIRECT_URL in .env 
import { Loader } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { checkAuthStatus } from "./actions"; // server action


const Page = () => {
    const router = useRouter();
    const {user} = useKindeBrowserClient();
    const { data} = useQuery({
        queryKey: ["checkAuthStatus"],
        queryFn: async () => await checkAuthStatus()
    });
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