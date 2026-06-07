import { Request } from "express";
import axios from "axios";

export const getMetaData = async (req: Request) => {
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] ||req.socket.remoteAddress ||"";

    const userAgent = req.headers["user-agent"] || "";

    let location = {
        address: "",
        country: "",
        city: "",
        coordinates: {
            lat: null as number | null,
            lng: null as number | null,
        },
    };

    try {
        const geoResponse = await axios.get(`https://ipapi.co/${ip}/json/`);

        location = {
            address: geoResponse.data.city || "",
            country: geoResponse.data.country_name || "",
            city: geoResponse.data.city || "",
            coordinates: {
                lat: geoResponse.data.latitude || null,
                lng: geoResponse.data.longitude || null,
            },
        };
    } catch (error) {
        console.error("Geo location fetch failed");
    }

    const meta = {
        ip,
        userAgent,
        location,
    };
    return meta;
};