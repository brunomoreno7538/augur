import { ErratumGrammaticae } from "../errors"
import { tessellare } from "../lexer/lexer"
import type { GenusTesserae, Tessera } from "../lexer/tokens"
import type {
  CampusSpeciei,
  ClavisPraecepti,
  Expressio,
  NomenSpeciei,
  OperatioCollectionisGenus,
  OperatorBinarius,
  ParTabulae,
  RamusConditionis,
  Sententia,
  SpeciesExpectata,
} from "./ast"

const FINIS_FICTUS: Tessera = { genus: "EOF", lexema: "", linea: -1, columna: -1 }

export class Grammaticus {
  private index = 0

  constructor(private readonly tesserae: Tessera[]) {}

  analyza(): Sententia[] {
    const sententiae: Sententia[] = []
    while (!this.adFinem()) {
      const notae = this.legeContextus()
      if (this.adFinem()) break
      const s = this.legeSententiam()
      if (notae) s.contextus = notae
      sententiae.push(s)
    }
    return sententiae
  }

  private legeBlocus(): Sententia[] {
    this.expecta("LBRACE", "'{'")
    const sententiae: Sententia[] = []
    while (!this.inspice("RBRACE") && !this.adFinem()) {
      const notae = this.legeContextus()
      if (this.inspice("RBRACE") || this.adFinem()) break
      const s = this.legeSententiam()
      if (notae) s.contextus = notae
      sententiae.push(s)
    }
    this.expecta("RBRACE", "'}'")
    return sententiae
  }

  private legeCorpus(): Sententia[] {
    if (this.inspice("LBRACE")) return this.legeBlocus()
    return [this.legeSententiam()]
  }

  private legeContextus(): string[] | undefined {
    const notae: string[] = []
    while (this.inspice("CONTEXT")) {
      notae.push(this.progredere().lexema)
    }
    return notae.length > 0 ? notae : undefined
  }

  private legeSententiam(): Sententia {
    const t = this.hic()
    switch (t.genus) {
      case "SUMMON":
        return this.legeDeclarationem()
      case "FORGET":
        return this.legeOblivionem()
      case "WHEN":
        return this.legeConditionem()
      case "WHILE":
        return this.legeDumIterationem()
      case "REPEAT":
        return this.legeRepetitionem()
      case "FOR":
        return this.legeIterationemPer()
      case "RITUAL":
        return this.legeDefinitionemRitus()
      case "GIVE":
        return this.legeRedditionem()
      case "BREAK":
        this.progredere()
        return { genus: "Interruptio" }
      case "CONTINUE":
        this.progredere()
        return { genus: "Continuatio" }
      case "BELIEVE":
        return this.legeAsseverationem()
      case "ATTEMPT":
        return this.legeConatum()
      case "CERTAIN":
      case "CHAOS":
        return this.legeBlocumZonae()
      case "COMMUNE":
        return this.legeCommunionem()
      case "INSCRIBE":
        return this.legeInscriptionem()
      case "REVISE":
        return this.legeRecensionem()
      case "BANISH":
        return this.legeExpulsionem()
      case "ORACLE":
      case "MODEL":
      case "TEMPERATURE":
      case "BUDGET":
        return this.legePraeceptum()
      case "PROCLAIM":
        this.progredere()
        return { genus: "Proclamatio", expressio: this.legeExpressionem() }
      case "WHISPER":
        this.progredere()
        return { genus: "Susurrus", expressio: this.legeExpressionem() }
      case "WRITE":
        return this.legeScriptionem()
      case "IDENT":
        if (this.inspice("ASSIGN", 1)) return this.legeReassignationem()
        return { genus: "SententiaExpressionis", expressio: this.legeExpressionem() }
      default:
        return { genus: "SententiaExpressionis", expressio: this.legeExpressionem() }
    }
  }

  private legeDeclarationem(): Sententia {
    this.progredere()
    const nomen = this.expecta("IDENT", "an identifier").lexema
    this.expecta("ASSIGN", "'='")
    return { genus: "DeclaratioVar", nomen, valor: this.legeExpressionem() }
  }

  private legeReassignationem(): Sententia {
    const nomen = this.progredere().lexema
    this.expecta("ASSIGN", "'='")
    return { genus: "Reassignatio", nomen, valor: this.legeExpressionem() }
  }

  private legeOblivionem(): Sententia {
    this.progredere()
    const nomen = this.expecta("IDENT", "an identifier").lexema
    return { genus: "Oblivio", nomen }
  }

  private legeConditionem(): Sententia {
    const rami: RamusConditionis[] = []
    this.expecta("WHEN", "'when'")
    rami.push(this.legeRamum())
    while (this.inspice("WHEN")) {
      this.progredere()
      rami.push(this.legeRamum())
    }
    let aliter: Sententia[] | undefined
    if (this.inspice("OTHERWISE")) {
      this.progredere()
      this.expecta("ARROW", "'->'")
      aliter = this.legeCorpus()
    }
    return { genus: "Conditio", rami, aliter }
  }

  private legeRamum(): RamusConditionis {
    const condicio = this.legeExpressionem()
    this.expecta("ARROW", "'->'")
    return { condicio, corpus: this.legeCorpus() }
  }

  private legeDumIterationem(): Sententia {
    this.progredere()
    const condicio = this.legeExpressionem()
    return { genus: "DumIteratio", condicio, corpus: this.legeCorpus() }
  }

  private legeRepetitionem(): Sententia {
    this.progredere()
    let quotiens: Expressio | null = null
    if (this.inspice("FOREVER")) {
      this.progredere()
    } else {
      quotiens = this.legeExpressionem()
    }
    return { genus: "Repetitio", quotiens, corpus: this.legeCorpus() }
  }

  private legeIterationemPer(): Sententia {
    this.progredere()
    const nomen = this.expecta("IDENT", "an identifier").lexema
    this.expecta("IN", "'in'")
    const iterabile = this.legeExpressionem()
    return { genus: "IteratioPer", nomen, iterabile, corpus: this.legeCorpus() }
  }

  private legeDefinitionemRitus(): Sententia {
    this.progredere()
    const nomen = this.expecta("IDENT", "an identifier").lexema
    this.expecta("LPAREN", "'('")
    const parametri: string[] = []
    if (!this.inspice("RPAREN")) {
      parametri.push(this.expecta("IDENT", "a parameter name").lexema)
      while (this.inspice("COMMA")) {
        this.progredere()
        parametri.push(this.expecta("IDENT", "a parameter name").lexema)
      }
    }
    this.expecta("RPAREN", "')'")
    if (this.inspice("DIVINED")) {
      this.progredere()
      return { genus: "DefinitioRitus", nomen, parametri, corpus: null }
    }
    return { genus: "DefinitioRitus", nomen, parametri, corpus: this.legeBlocus() }
  }

  private legeRedditionem(): Sententia {
    this.progredere()
    if (this.inspice("RBRACE") || this.adFinem()) {
      return { genus: "Redditio", valor: null }
    }
    return { genus: "Redditio", valor: this.legeExpressionem() }
  }

  private legeAsseverationem(): Sententia {
    this.progredere()
    const expressio = this.legeExpressionem()
    let causa: string | undefined
    if (this.inspice("BECAUSE")) {
      this.progredere()
      causa = this.expecta("STRING", "a reason string").lexema
    }
    return { genus: "Asseveratio", expressio, causa }
  }

  private legeConatum(): Sententia {
    this.progredere()
    const corpus = this.legeBlocus()
    this.expecta("RESCUE", "'rescue'")
    let nomenErroris: string | undefined
    if (this.inspice("AS")) {
      this.progredere()
      nomenErroris = this.expecta("IDENT", "an identifier").lexema
    }
    const remedium = this.legeBlocus()
    return { genus: "Conatus", corpus, nomenErroris, remedium }
  }

  private legeBlocumZonae(): Sententia {
    const clavis = this.progredere()
    if (clavis.genus === "CERTAIN") {
      return { genus: "BlocusZonae", zonaGenus: "Certus", temperatura: null, corpus: this.legeBlocus() }
    }
    let temperatura: number | null = null
    if (this.inspice("NUMBER")) {
      temperatura = Number.parseFloat(this.progredere().lexema)
    }
    return { genus: "BlocusZonae", zonaGenus: "Chaos", temperatura, corpus: this.legeBlocus() }
  }

  private legeCommunionem(): Sententia {
    this.progredere()
    this.expecta("WITH", "'with'")
    const locus = this.expecta("STRING", "a connection string").lexema
    return { genus: "Communio", locus }
  }

  private legeInscriptionem(): Sententia {
    this.progredere()
    const datum = this.legeExpressionem()
    this.expecta("INTO", "'into'")
    const collectio = this.expecta("IDENT", "a collection name").lexema
    return { genus: "Inscriptio", datum, collectio }
  }

  private legeRecensionem(): Sententia {
    this.progredere()
    const scopus = this.legeExpressionem()
    this.expecta("WITH", "'with'")
    const instructio = this.expecta("STRING", "an instruction string").lexema
    return { genus: "Recensio", scopus, instructio }
  }

  private legeExpulsionem(): Sententia {
    this.progredere()
    const descriptio = this.expecta("STRING", "a description string").lexema
    this.expecta("FROM", "'from'")
    const collectio = this.expecta("IDENT", "a collection name").lexema
    return { genus: "Expulsio", descriptio, collectio }
  }

  private legePraeceptum(): Sententia {
    const t = this.progredere()
    const clavis = t.lexema as ClavisPraecepti
    if (clavis === "oracle" || clavis === "model") {
      const valor = this.expecta("STRING", "a string value").lexema
      return { genus: "Praeceptum", clavis, valor }
    }
    const valor = Number.parseFloat(this.expecta("NUMBER", "a number value").lexema)
    return { genus: "Praeceptum", clavis, valor }
  }

  private legeScriptionem(): Sententia {
    this.progredere()
    const datum = this.legeExpressionem()
    this.expecta("TO", "'to'")
    const fasciculus = this.legeExpressionem()
    return { genus: "Scriptio", datum, fasciculus }
  }

  private legeExpressionem(): Expressio {
    return this.legeDisiunctionem()
  }

  private legeDisiunctionem(): Expressio {
    let sinistra = this.legeConiunctionem()
    while (this.inspice("OR")) {
      this.progredere()
      const dextra = this.legeConiunctionem()
      sinistra = { genus: "ExpressioLogica", operator: "or", sinistra, dextra }
    }
    return sinistra
  }

  private legeConiunctionem(): Expressio {
    let sinistra = this.legeNegationem()
    while (this.inspice("AND")) {
      this.progredere()
      const dextra = this.legeNegationem()
      sinistra = { genus: "ExpressioLogica", operator: "and", sinistra, dextra }
    }
    return sinistra
  }

  private legeNegationem(): Expressio {
    if (this.inspice("NOT")) {
      this.progredere()
      return { genus: "ExpressioUnaria", operator: "not", operandum: this.legeNegationem() }
    }
    return this.legeAequalitatem()
  }

  private legeAequalitatem(): Expressio {
    let sinistra = this.legeComparationem()
    while (this.inspice("EQ_EQ") || this.inspice("BANG_EQ")) {
      const operator = this.progredere().lexema as OperatorBinarius
      const dextra = this.legeComparationem()
      sinistra = { genus: "ExpressioBinaria", operator, sinistra, dextra }
    }
    return sinistra
  }

  private legeComparationem(): Expressio {
    let sinistra = this.legeAdditionem()
    while (
      this.inspice("LT") ||
      this.inspice("GT") ||
      this.inspice("LT_EQ") ||
      this.inspice("GT_EQ")
    ) {
      const operator = this.progredere().lexema as OperatorBinarius
      const dextra = this.legeAdditionem()
      sinistra = { genus: "ExpressioBinaria", operator, sinistra, dextra }
    }
    return sinistra
  }

  private legeAdditionem(): Expressio {
    let sinistra = this.legeMultiplicationem()
    while (this.inspice("PLUS") || this.inspice("MINUS")) {
      const operator = this.progredere().lexema as OperatorBinarius
      const dextra = this.legeMultiplicationem()
      sinistra = { genus: "ExpressioBinaria", operator, sinistra, dextra }
    }
    return sinistra
  }

  private legeMultiplicationem(): Expressio {
    let sinistra = this.legePotentiam()
    while (this.inspice("STAR") || this.inspice("SLASH") || this.inspice("PERCENT")) {
      const operator = this.progredere().lexema as OperatorBinarius
      const dextra = this.legePotentiam()
      sinistra = { genus: "ExpressioBinaria", operator, sinistra, dextra }
    }
    return sinistra
  }

  private legePotentiam(): Expressio {
    const sinistra = this.legeUnariam()
    if (this.inspice("CARET")) {
      this.progredere()
      const dextra = this.legePotentiam()
      return { genus: "ExpressioBinaria", operator: "^", sinistra, dextra }
    }
    return sinistra
  }

  private legeUnariam(): Expressio {
    if (this.inspice("MINUS")) {
      this.progredere()
      return { genus: "ExpressioUnaria", operator: "-", operandum: this.legeUnariam() }
    }
    return this.legePostfixum()
  }

  private legePostfixum(): Expressio {
    let basis = this.legePrimarium()
    for (;;) {
      if (this.inspice("LPAREN")) {
        this.progredere()
        const argumenta: Expressio[] = []
        if (!this.inspice("RPAREN")) {
          argumenta.push(this.legeExpressionem())
          while (this.inspice("COMMA")) {
            this.progredere()
            argumenta.push(this.legeExpressionem())
          }
        }
        this.expecta("RPAREN", "')'")
        basis = { genus: "Vocatio", advocatus: basis, argumenta }
      } else if (this.inspice("LBRACKET")) {
        this.progredere()
        const index = this.legeExpressionem()
        this.expecta("RBRACKET", "']'")
        basis = { genus: "Indicium", basis, index }
      } else if (this.inspice("AS")) {
        this.progredere()
        basis = { genus: "Coercio", subiectum: basis, species: this.legeSpeciem() }
      } else {
        return basis
      }
    }
  }

  private legeSpeciem(): SpeciesExpectata {
    if (this.inspice("LBRACKET")) {
      this.progredere()
      const elementum = this.legeSpeciem()
      this.expecta("RBRACKET", "']'")
      return { genus: "agmen", elementum }
    }
    if (this.inspice("LBRACE")) {
      this.progredere()
      const campi: CampusSpeciei[] = []
      if (!this.inspice("RBRACE")) {
        campi.push(this.legeCampumSpeciei())
        while (this.inspice("COMMA")) {
          this.progredere()
          campi.push(this.legeCampumSpeciei())
        }
      }
      this.expecta("RBRACE", "'}'")
      return { genus: "tabula", campi }
    }
    const nomen = this.expecta("IDENT", "a type name").lexema
    return { genus: "primitiva", nomen: this.normaSpeciei(nomen) }
  }

  private legeCampumSpeciei(): CampusSpeciei {
    const t = this.hic()
    let clavis: string
    if (t.genus === "IDENT" || t.genus === "STRING") {
      clavis = this.progredere().lexema
    } else {
      throw this.erratum("a field name")
    }
    this.expecta("COLON", "':'")
    return { clavis, species: this.legeSpeciem() }
  }

  private normaSpeciei(nomen: string): NomenSpeciei {
    switch (nomen) {
      case "number":
      case "num":
      case "int":
      case "float":
        return "number"
      case "text":
      case "string":
      case "str":
        return "text"
      case "bool":
      case "boolean":
      case "truth":
        return "bool"
      case "list":
      case "array":
        return "list"
      case "map":
      case "object":
      case "obj":
        return "map"
      case "any":
        return "any"
      default:
        throw this.erratum(`a type name (got '${nomen}')`)
    }
  }

  private legePrimarium(): Expressio {
    const t = this.hic()
    switch (t.genus) {
      case "NUMBER":
        this.progredere()
        return { genus: "LitteraNumeri", valor: Number.parseFloat(t.lexema) }
      case "STRING":
        this.progredere()
        return { genus: "LitteraTextus", valor: t.lexema }
      case "YES":
        this.progredere()
        return { genus: "LitteraVeritatis", valor: true }
      case "NO":
        this.progredere()
        return { genus: "LitteraVeritatis", valor: false }
      case "NAUGHT":
        this.progredere()
        return { genus: "LitteraNihil" }
      case "IDENT":
        this.progredere()
        return { genus: "Nomen", nomen: t.lexema }
      case "LPAREN": {
        this.progredere()
        const e = this.legeExpressionem()
        this.expecta("RPAREN", "')'")
        return e
      }
      case "LBRACKET":
        return this.legeAgmen()
      case "LBRACE":
        return this.legeTabulam()
      case "DIVINE":
        return this.legeDivinationem()
      case "GATHER":
        this.progredere()
        return { genus: "Congregatio", subiectum: this.legePostfixum() }
      case "FETCH":
        return this.legePetitionem()
      case "ASK":
        this.progredere()
        return { genus: "Interrogatio", invitatio: this.expecta("STRING", "a prompt string").lexema }
      case "QUERY":
        this.progredere()
        return { genus: "Consultatio", interrogatio: this.expecta("STRING", "a query string").lexema }
      case "RECALL":
        return this.legeMemoriam()
      case "READ":
        this.progredere()
        return { genus: "Lectio", fasciculus: this.legeExpressionem() }
      case "SORT":
      case "FILTER":
      case "MAP":
      case "PICK":
      case "CLASSIFY":
      case "EXTRACT":
      case "COUNT":
      case "SUM":
      case "REVERSE":
      case "UNIQUE":
        return this.legeOperationemCollectionis()
      default:
        throw this.erratum("an expression")
    }
  }

  private legeAgmen(): Expressio {
    this.expecta("LBRACKET", "'['")
    const elementa: Expressio[] = []
    if (!this.inspice("RBRACKET")) {
      elementa.push(this.legeExpressionem())
      while (this.inspice("COMMA")) {
        this.progredere()
        elementa.push(this.legeExpressionem())
      }
    }
    this.expecta("RBRACKET", "']'")
    return { genus: "LitteraAgminis", elementa }
  }

  private legeTabulam(): Expressio {
    this.expecta("LBRACE", "'{'")
    const paria: ParTabulae[] = []
    if (!this.inspice("RBRACE")) {
      paria.push(this.legePar())
      while (this.inspice("COMMA")) {
        this.progredere()
        paria.push(this.legePar())
      }
    }
    this.expecta("RBRACE", "'}'")
    return { genus: "LitteraTabulae", paria }
  }

  private legePar(): ParTabulae {
    const claviTessera = this.hic()
    let clavis: string
    if (claviTessera.genus === "STRING" || claviTessera.genus === "IDENT") {
      clavis = this.progredere().lexema
    } else {
      throw this.erratum("a map key (identifier or string)")
    }
    this.expecta("COLON", "':'")
    return { clavis, valor: this.legeExpressionem() }
  }

  private legeDivinationem(): Expressio {
    this.progredere()
    const instructio = this.expecta("STRING", "an instruction string").lexema
    let supra: Expressio | undefined
    if (this.inspice("UPON")) {
      this.progredere()
      supra = this.legeExpressionem()
    }
    let consensus = 1
    if (this.inspice("THRICE")) {
      this.progredere()
      consensus = 3
    }
    return { genus: "Divinatio", instructio, supra, consensus }
  }

  private legePetitionem(): Expressio {
    this.progredere()
    const url = this.legeExpressionem()
    let optiones: Expressio | undefined
    if (this.inspice("WITH")) {
      this.progredere()
      optiones = this.legeTabulam()
    }
    return { genus: "Petitio", url, optiones }
  }

  private legeMemoriam(): Expressio {
    this.progredere()
    const descriptio = this.expecta("STRING", "a description string").lexema
    this.expecta("FROM", "'from'")
    const collectio = this.expecta("IDENT", "a collection name").lexema
    return { genus: "Memoria", descriptio, collectio }
  }

  private legeOperationemCollectionis(): Expressio {
    const t = this.progredere()
    const operatio = t.genus.toLowerCase() as OperatioCollectionisGenus

    if (operatio === "extract") {
      const criterium = this.expecta("STRING", "a 'what' string").lexema
      this.expecta("FROM", "'from'")
      const subiectum = this.legeExpressionem()
      return { genus: "OperatioCollectionis", operatio, subiectum, criterium, rotuli: undefined }
    }

    const subiectum = this.legeExpressionem()

    if (operatio === "filter") {
      this.expecta("BY", "'by'")
      const criterium = this.expecta("STRING", "a criterion string").lexema
      return { genus: "OperatioCollectionis", operatio, subiectum, criterium, rotuli: undefined }
    }

    if (operatio === "map") {
      this.expecta("WITH", "'with'")
      const criterium = this.expecta("STRING", "a transformation string").lexema
      return { genus: "OperatioCollectionis", operatio, subiectum, criterium, rotuli: undefined }
    }

    if (operatio === "classify") {
      this.expecta("INTO", "'into'")
      const agmen = this.legeAgmen()
      const rotuli = agmen.genus === "LitteraAgminis" ? agmen.elementa : []
      return { genus: "OperatioCollectionis", operatio, subiectum, criterium: undefined, rotuli }
    }

    if (operatio === "sort" || operatio === "pick") {
      let criterium: string | undefined
      if (this.inspice("BY")) {
        this.progredere()
        criterium = this.expecta("STRING", "a criterion string").lexema
      }
      return { genus: "OperatioCollectionis", operatio, subiectum, criterium, rotuli: undefined }
    }

    return { genus: "OperatioCollectionis", operatio, subiectum, criterium: undefined, rotuli: undefined }
  }

  private hic(): Tessera {
    return this.tesserae[this.index] ?? FINIS_FICTUS
  }

  private inspice(genus: GenusTesserae, distantia = 0): boolean {
    return (this.tesserae[this.index + distantia] ?? FINIS_FICTUS).genus === genus
  }

  private progredere(): Tessera {
    const t = this.hic()
    if (!this.adFinem()) this.index++
    return t
  }

  private expecta(genus: GenusTesserae, quid: string): Tessera {
    if (this.inspice(genus)) return this.progredere()
    throw this.erratum(quid)
  }

  private erratum(quid: string): ErratumGrammaticae {
    const t = this.hic()
    const visum = t.genus === "EOF" ? "end of input" : `'${t.lexema}' (${t.genus})`
    return new ErratumGrammaticae(`expected ${quid}, found ${visum}`, t.linea, t.columna)
  }

  private adFinem(): boolean {
    return this.hic().genus === "EOF"
  }
}

export function analyza(fons: string): Sententia[] {
  return new Grammaticus(tessellare(fons)).analyza()
}
