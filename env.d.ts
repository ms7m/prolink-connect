declare module '*.ksy';
declare module 'kaitai-struct-compiler' {
  declare class KaitaiStructCompiler {
    public constructor();

    /**
     * Compiles the Kaitai source into a parser.
     * @param language The language to compile to.
     * @param data The Kaitai source data.
     * @param fileLoader (optional) The file loader to use to resolve imports.
     * @param debugMode (optional) Enables debug mode.
     */
    public compile(
      language: string,
      data: unknown,
      fileLoader?: FileLoader | null | undefined,
      debugMode?: boolean | null | undefined
    ): Promise<Record<string, string>>;
  }

  export default KaitaiStructCompiler;
}
