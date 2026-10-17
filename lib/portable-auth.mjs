import {AsyncLocalStorage} from 'node:async_hooks';
export const requestContext=new AsyncLocalStorage();
export async function getWorkspaceUser(){return requestContext.getStore()?.user||null;}
