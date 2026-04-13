export type OperatorBinarius =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "^"
  | "=="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="

export type OperatorLogicus = "and" | "or"

export type OperatorUnarius = "-" | "not"

export type OperatioCollectionisGenus =
  | "sort"
  | "filter"
  | "map"
  | "pick"
  | "classify"
  | "extract"
  | "count"
  | "sum"
  | "reverse"
  | "unique"

export type ClavisPraecepti = "oracle" | "model" | "temperature" | "budget"

export interface LitteraNumeri {
  genus: "LitteraNumeri"
  valor: number
}

export interface LitteraTextus {
  genus: "LitteraTextus"
  valor: string
}

export interface LitteraVeritatis {
  genus: "LitteraVeritatis"
  valor: boolean
}

export interface LitteraNihil {
  genus: "LitteraNihil"
}

export interface LitteraAgminis {
  genus: "LitteraAgminis"
  elementa: Expressio[]
}

export interface ParTabulae {
  clavis: string
  valor: Expressio
}

export interface LitteraTabulae {
  genus: "LitteraTabulae"
  paria: ParTabulae[]
}

export interface Nomen {
  genus: "Nomen"
  nomen: string
}

export interface ExpressioBinaria {
  genus: "ExpressioBinaria"
  operator: OperatorBinarius
  sinistra: Expressio
  dextra: Expressio
}

export interface ExpressioLogica {
  genus: "ExpressioLogica"
  operator: OperatorLogicus
  sinistra: Expressio
  dextra: Expressio
}

export interface ExpressioUnaria {
  genus: "ExpressioUnaria"
  operator: OperatorUnarius
  operandum: Expressio
}

export interface Vocatio {
  genus: "Vocatio"
  advocatus: Expressio
  argumenta: Expressio[]
}

export interface Indicium {
  genus: "Indicium"
  basis: Expressio
  index: Expressio
}

export interface Divinatio {
  genus: "Divinatio"
  instructio: string
  supra: Expressio | undefined
}

export interface Petitio {
  genus: "Petitio"
  url: Expressio
  optiones: Expressio | undefined
}

export interface Interrogatio {
  genus: "Interrogatio"
  invitatio: string
}

export interface Consultatio {
  genus: "Consultatio"
  interrogatio: string
}

export interface Memoria {
  genus: "Memoria"
  descriptio: string
  collectio: string
}

export interface Lectio {
  genus: "Lectio"
  fasciculus: Expressio
}

export interface OperatioCollectionis {
  genus: "OperatioCollectionis"
  operatio: OperatioCollectionisGenus
  subiectum: Expressio
  criterium: string | undefined
  rotuli: Expressio[] | undefined
}

export type NomenSpeciei = "number" | "text" | "bool" | "list" | "map" | "any"

export interface CampusSpeciei {
  clavis: string
  species: SpeciesExpectata
}

export type SpeciesExpectata =
  | { genus: "primitiva"; nomen: NomenSpeciei }
  | { genus: "agmen"; elementum: SpeciesExpectata }
  | { genus: "tabula"; campi: CampusSpeciei[] }

export interface Coercio {
  genus: "Coercio"
  subiectum: Expressio
  species: SpeciesExpectata
}

export type Expressio =
  | LitteraNumeri
  | LitteraTextus
  | LitteraVeritatis
  | LitteraNihil
  | LitteraAgminis
  | LitteraTabulae
  | Nomen
  | ExpressioBinaria
  | ExpressioLogica
  | ExpressioUnaria
  | Vocatio
  | Indicium
  | Coercio
  | Divinatio
  | Petitio
  | Interrogatio
  | Consultatio
  | Memoria
  | Lectio
  | OperatioCollectionis

export interface DeclaratioVar {
  genus: "DeclaratioVar"
  nomen: string
  valor: Expressio
}

export interface Reassignatio {
  genus: "Reassignatio"
  nomen: string
  valor: Expressio
}

export interface Oblivio {
  genus: "Oblivio"
  nomen: string
}

export interface RamusConditionis {
  condicio: Expressio
  corpus: Sententia[]
}

export interface Conditio {
  genus: "Conditio"
  rami: RamusConditionis[]
  aliter: Sententia[] | undefined
}

export interface DumIteratio {
  genus: "DumIteratio"
  condicio: Expressio
  corpus: Sententia[]
}

export interface Repetitio {
  genus: "Repetitio"
  quotiens: Expressio | null
  corpus: Sententia[]
}

export interface IteratioPer {
  genus: "IteratioPer"
  nomen: string
  iterabile: Expressio
  corpus: Sententia[]
}

export interface DefinitioRitus {
  genus: "DefinitioRitus"
  nomen: string
  parametri: string[]
  corpus: Sententia[] | null
}

export interface Redditio {
  genus: "Redditio"
  valor: Expressio | null
}

export interface Interruptio {
  genus: "Interruptio"
}

export interface Continuatio {
  genus: "Continuatio"
}

export interface Asseveratio {
  genus: "Asseveratio"
  expressio: Expressio
  causa: string | undefined
}

export interface Conatus {
  genus: "Conatus"
  corpus: Sententia[]
  nomenErroris: string | undefined
  remedium: Sententia[]
}

export interface BlocusZonae {
  genus: "BlocusZonae"
  zonaGenus: "Certus" | "Chaos"
  temperatura: number | null
  corpus: Sententia[]
}

export interface Praeceptum {
  genus: "Praeceptum"
  clavis: ClavisPraecepti
  valor: string | number
}

export interface Communio {
  genus: "Communio"
  locus: string
}

export interface Inscriptio {
  genus: "Inscriptio"
  datum: Expressio
  collectio: string
}

export interface Recensio {
  genus: "Recensio"
  scopus: Expressio
  instructio: string
}

export interface Expulsio {
  genus: "Expulsio"
  descriptio: string
  collectio: string
}

export interface Proclamatio {
  genus: "Proclamatio"
  expressio: Expressio
}

export interface Susurrus {
  genus: "Susurrus"
  expressio: Expressio
}

export interface Scriptio {
  genus: "Scriptio"
  datum: Expressio
  fasciculus: Expressio
}

export interface SententiaExpressionis {
  genus: "SententiaExpressionis"
  expressio: Expressio
}

export type SententiaNuda =
  | DeclaratioVar
  | Reassignatio
  | Oblivio
  | Conditio
  | DumIteratio
  | Repetitio
  | IteratioPer
  | DefinitioRitus
  | Redditio
  | Interruptio
  | Continuatio
  | Asseveratio
  | Conatus
  | BlocusZonae
  | Praeceptum
  | Communio
  | Inscriptio
  | Recensio
  | Expulsio
  | Proclamatio
  | Susurrus
  | Scriptio
  | SententiaExpressionis

export type Sententia = SententiaNuda & { contextus?: string[] }

export type Programma = Sententia[]
