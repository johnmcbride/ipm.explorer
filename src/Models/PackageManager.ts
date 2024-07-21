import { IPMPackage } from "../Interfaces/IPMPackage";

export class PackageManager
{
    public name: string;
    public url: string;
    public packages: Array<IPMPackage>;

    constructor(pmname:string, pmurl:string, pmPackages:Array<IPMPackage>)
    {
        this.name = pmname;
        this.url = pmurl;
        this.packages = pmPackages;
    }
}