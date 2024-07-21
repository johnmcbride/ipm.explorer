'use strict';
import { json } from 'stream/consumers';
import * as vscode from 'vscode';
interface IPackage
{
    name: string
    description: string;
    repository: string;
    origin: string;
    is_owner: string;
    versions: Array<string>;  
}
export class Package
{
    public name: string;
    public description: string;
    public repository: string;
    public origin: string;
    public is_owner: string;
    public versions: Array<string>;
    constructor(
        jsonObject: string
    ) 
    {
        let p:IPackage = JSON.parse(jsonObject);

        this.name = p.name;
        this.description = p.description;
        this.repository = p.repository;
        this.origin = p.origin;
        this.is_owner = p.is_owner;
        this.versions = p.versions;
    }
}