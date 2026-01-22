import { describe, expect, it } from "vitest"
import { ErratumLectionis } from "../src/errors"
import { tessellare } from "../src/lexer/lexer"
import { VERBA_RESERVATA, type GenusTesserae } from "../src/lexer/tokens"

function genera(fons: string): GenusTesserae[] {
  return tessellare(fons).map((t) => t.genus)
}

describe("numbers", () => {
  it("lexes integers and decimals", () => {
    const t = tessellare("42 3.14")
    expect(t.map((x) => x.genus)).toEqual(["NUMBER", "NUMBER", "EOF"])
    expect(t[0]?.lexema).toBe("42")
    expect(t[1]?.lexema).toBe("3.14")
  })

  it("rejects a trailing decimal point", () => {
    expect(() => tessellare("3.")).toThrow(ErratumLectionis)
  })
})

describe("strings", () => {
  it("lexes a simple string without quotes in the lexeme", () => {
    const t = tessellare('"hello"')
    expect(t[0]?.genus).toBe("STRING")
    expect(t[0]?.lexema).toBe("hello")
  })

  it("decodes escape sequences", () => {
    const t = tessellare('"a\\nb\\t\\"c"')
    expect(t[0]?.lexema).toBe('a\nb\t"c')
  })

  it("throws on an unterminated string", () => {
    expect(() => tessellare('"oops')).toThrow(ErratumLectionis)
  })
})

describe("identifiers and keywords", () => {
  it("distinguishes a keyword from an identifier", () => {
    expect(genera("summon foo")).toEqual(["SUMMON", "IDENT", "EOF"])
  })

  it("lexes the literal keywords", () => {
    expect(genera("yes no naught")).toEqual(["YES", "NO", "NAUGHT", "EOF"])
  })

  it("maps every reserved word to its token kind", () => {
    for (const [verbum, genus] of Object.entries(VERBA_RESERVATA)) {
      const t = tessellare(verbum)
      expect(t[0]?.genus).toBe(genus)
      expect(t[0]?.lexema).toBe(verbum)
    }
  })
})

describe("operators", () => {
  it("lexes every operator", () => {
    expect(genera("+ - * / % ^ == != < > <= >= = -> :")).toEqual([
      "PLUS",
      "MINUS",
      "STAR",
      "SLASH",
      "PERCENT",
      "CARET",
      "EQ_EQ",
      "BANG_EQ",
      "LT",
      "GT",
      "LT_EQ",
      "GT_EQ",
      "ASSIGN",
      "ARROW",
      "COLON",
      "EOF",
    ])
  })

  it("disambiguates arrow from minus", () => {
    expect(genera("-> -")).toEqual(["ARROW", "MINUS", "EOF"])
  })

  it("throws on a lone bang", () => {
    expect(() => tessellare("!")).toThrow(ErratumLectionis)
  })
})

describe("punctuation", () => {
  it("lexes brackets, braces, parens and comma", () => {
    expect(genera("[ ] { } ( ) ,")).toEqual([
      "LBRACKET",
      "RBRACKET",
      "LBRACE",
      "RBRACE",
      "LPAREN",
      "RPAREN",
      "COMMA",
      "EOF",
    ])
  })
})

describe("comments", () => {
  it("discards line comments", () => {
    expect(genera("// nope\n42")).toEqual(["NUMBER", "EOF"])
  })

  it("discards block comments", () => {
    expect(genera("/* nope */ 42")).toEqual(["NUMBER", "EOF"])
  })

  it("throws on an unterminated block comment", () => {
    expect(() => tessellare("/* never closed")).toThrow(ErratumLectionis)
  })

  it("keeps context comments as CONTEXT tokens", () => {
    const t = tessellare("/// be precise\n42")
    expect(t[0]?.genus).toBe("CONTEXT")
    expect(t[0]?.lexema).toBe("be precise")
    expect(t[1]?.genus).toBe("NUMBER")
  })

  it("recognizes triple-slash before double-slash", () => {
    expect(genera("/// note")).toEqual(["CONTEXT", "EOF"])
  })
})

describe("positions", () => {
  it("tracks line and column", () => {
    const t = tessellare("  42")
    expect(t[0]).toMatchObject({ genus: "NUMBER", linea: 1, columna: 3 })
  })

  it("advances line on newline and resets column", () => {
    const t = tessellare("x\ny")
    expect(t[0]).toMatchObject({ genus: "IDENT", linea: 1, columna: 1 })
    expect(t[1]).toMatchObject({ genus: "IDENT", linea: 2, columna: 1 })
  })
})
