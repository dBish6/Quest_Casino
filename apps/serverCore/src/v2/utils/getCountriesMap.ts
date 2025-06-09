import { getCountriesMap as getMap } from "@qc/utils";

const { CDN_URL, PROTOCOL, HOST, PORT } = process.env;

const getCountriesMap = async () => getMap(CDN_URL!, `${PROTOCOL}${HOST}:${PORT}`);
export default getCountriesMap;
