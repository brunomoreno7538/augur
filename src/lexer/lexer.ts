import { ErratumLectionis } from "../errors"
import { VERBA_RESERVATA, type Tessera, type GenusTesserae } from "./tokens"

const FINIS = "\0"

export class Lector {
  private index = 0
  private linea = 1
  private columna = 1
  private readonly tesserae: Tessera[] = []

  constructor(private readonly fons: string) {}

  tessellare(): Tessera[] {
    while (!this.adFinem()) {
      this.legeTesseram()
    }
    this.tesserae.push({ genus: "EOF", lexema: "", linea: this.linea, columna: this.columna })
    return this.tesserae
  }

  private legeTesseram(): void {
    const linea = this.linea
    const columna = this.columna
    const c = this.inspice()

    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      this.progredere()
      return
    }

    if (c === "/") {
      this.legeVirgulam(linea, columna)
      return
    }

    if (estCifra(c)) {
      this.legeNumerum(linea, columna)
      return
    }

    if (c === '"') {
      this.legeTextum(linea, columna)
      return
    }

    if (estInitiumNominis(c)) {
      this.legeNomen(linea, columna)
      return
    }

    this.legeOperatorem(linea, columna)
  }

  private legeVirgulam(linea: number, columna: number): void {
    if (this.inspice(1) === "/" && this.inspice(2) === "/") {
      this.progredere()
      this.progredere()
      this.progredere()
      let textus = ""
      while (!this.adFinem() && this.inspice() !== "\n") {
        textus += this.progredere()
      }
      this.adde("CONTEXT", textus.trim(), linea, columna)
      return
    }

    if (this.inspice(1) === "/") {
      while (!this.adFinem() && this.inspice() !== "\n") this.progredere()
      return
    }

    if (this.inspice(1) === "*") {
      this.progredere()
      this.progredere()
      while (!this.adFinem() && !(this.inspice() === "*" && this.inspice(1) === "/")) {
        this.progredere()
      }
      if (this.adFinem()) {
        throw new ErratumLectionis("unterminated block comment", linea, columna)
      }
      this.progredere()
      this.progredere()
      return
    }

    this.progredere()
    this.adde("SLASH", "/", linea, columna)
  }

  private legeNumerum(linea: number, columna: number): void {
    const principium = this.index
    while (estCifra(this.inspice())) this.progredere()
    if (this.inspice() === ".") {
      if (!estCifra(this.inspice(1))) {
        throw new ErratumLectionis("malformed number: decimal point without digit", linea, columna)
      }
      this.progredere()
      while (estCifra(this.inspice())) this.progredere()
    }
    this.adde("NUMBER", this.fons.slice(principium, this.index), linea, columna)
  }

  private legeTextum(linea: number, columna: number): void {
    this.progredere()
    let valor = ""
    while (!this.adFinem() && this.inspice() !== '"' && this.inspice() !== "\n") {
      const c = this.progredere()
      if (c === "\\") {
        valor += this.legeEffugium(linea, columna)
      } else {
        valor += c
      }
    }
    if (this.inspice() !== '"') {
      throw new ErratumLectionis("unterminated string", linea, columna)
    }
    this.progredere()
    this.adde("STRING", valor, linea, columna)
  }

  private legeEffugium(linea: number, columna: number): string {
    if (this.adFinem()) throw new ErratumLectionis("unterminated string", linea, columna)
    const c = this.progredere()
    switch (c) {
      case "n":
        return "\n"
      case "t":
        return "\t"
      case "r":
        return "\r"
      case '"':
        return '"'
      case "\\":
        return "\\"
      default:
        return c
    }
  }

  private legeNomen(linea: number, columna: number): void {
    const principium = this.index
    while (estParsNominis(this.inspice())) this.progredere()
    const verbum = this.fons.slice(principium, this.index)
    const reservatum = VERBA_RESERVATA[verbum]
    this.adde(reservatum ?? "IDENT", verbum, linea, columna)
  }

  private legeOperatorem(linea: number, columna: number): void {
    const c = this.progredere()
    switch (c) {
      case "+":
        return this.adde("PLUS", c, linea, columna)
      case "-":
        if (this.inspice() === ">") {
          this.progredere()
          return this.adde("ARROW", "->", linea, columna)
        }
        return this.adde("MINUS", c, linea, columna)
      case "*":
        return this.adde("STAR", c, linea, columna)
      case "%":
        return this.adde("PERCENT", c, linea, columna)
      case "^":
        return this.adde("CARET", c, linea, columna)
      case "=":
        if (this.inspice() === "=") {
          this.progredere()
          return this.adde("EQ_EQ", "==", linea, columna)
        }
        return this.adde("ASSIGN", "=", linea, columna)
      case "!":
        if (this.inspice() === "=") {
          this.progredere()
          return this.adde("BANG_EQ", "!=", linea, columna)
        }
        throw new ErratumLectionis("unexpected '!' (did you mean '!='?)", linea, columna)
      case "<":
        if (this.inspice() === "=") {
          this.progredere()
          return this.adde("LT_EQ", "<=", linea, columna)
        }
        return this.adde("LT", "<", linea, columna)
      case ">":
        if (this.inspice() === "=") {
          this.progredere()
          return this.adde("GT_EQ", ">=", linea, columna)
        }
        return this.adde("GT", ">", linea, columna)
      case ":":
        return this.adde("COLON", c, linea, columna)
      case ",":
        return this.adde("COMMA", c, linea, columna)
      case "(":
        return this.adde("LPAREN", c, linea, columna)
      case ")":
        return this.adde("RPAREN", c, linea, columna)
      case "[":
        return this.adde("LBRACKET", c, linea, columna)
      case "]":
        return this.adde("RBRACKET", c, linea, columna)
      case "{":
        return this.adde("LBRACE", c, linea, columna)
      case "}":
        return this.adde("RBRACE", c, linea, columna)
      default:
        throw new ErratumLectionis(`unexpected character '${c}'`, linea, columna)
    }
  }

  private adde(genus: GenusTesserae, lexema: string, linea: number, columna: number): void {
    this.tesserae.push({ genus, lexema, linea, columna })
  }

  private inspice(distantia = 0): string {
    return this.fons[this.index + distantia] ?? FINIS
  }

  private progredere(): string {
    const c = this.fons[this.index] ?? FINIS
    this.index++
    if (c === "\n") {
      this.linea++
      this.columna = 1
    } else {
      this.columna++
    }
    return c
  }

  private adFinem(): boolean {
    return this.index >= this.fons.length
  }
}

export function tessellare(fons: string): Tessera[] {
  return new Lector(fons).tessellare()
}

function estCifra(c: string): boolean {
  return c >= "0" && c <= "9"
}

function estInitiumNominis(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_"
}

function estParsNominis(c: string): boolean {
  return estInitiumNominis(c) || estCifra(c)
}
