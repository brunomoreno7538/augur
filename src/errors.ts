export class AugurErratum extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ErratumLectionis extends AugurErratum {
  constructor(
    message: string,
    readonly linea: number,
    readonly columna: number,
  ) {
    super(`${message} (line ${linea}, column ${columna})`)
  }
}

export class ErratumGrammaticae extends AugurErratum {
  constructor(
    message: string,
    readonly linea: number,
    readonly columna: number,
  ) {
    super(`${message} (line ${linea}, column ${columna})`)
  }
}

export class ErratumExsecutionis extends AugurErratum {}

export class ErratumOraculi extends AugurErratum {
  constructor(readonly causa?: string) {
    super(causa ? `The oracle disagrees — ${causa}` : "The oracle disagrees")
  }
}

export class ErratumAerarii extends AugurErratum {
  constructor(readonly limen: number) {
    super(`Divination budget exceeded (ceiling ${limen})`)
  }
}
