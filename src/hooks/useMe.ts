import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api/account";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: getMe });
