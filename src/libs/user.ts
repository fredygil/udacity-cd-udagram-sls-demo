import {decode} from "jsonwebtoken";
import { JwtToken } from "./jwtToken";

export const getUserId = (jwtToken: string): string => {
    const tokenData:JwtToken = decode(jwtToken);
    return tokenData.sub;
}