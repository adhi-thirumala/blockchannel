declare module 'borsh' {
  export type Schema = any;
  
  export function serialize(schema: Schema, obj: any): Uint8Array;
  export function deserialize(schema: Schema, classType: any, buffer: Buffer | Uint8Array): any;
} 