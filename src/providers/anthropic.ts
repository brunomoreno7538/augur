import Anthropic from "@anthropic-ai/sdk"
import { construePrompt, INSTRUCTIO_SYSTEMATIS, restringeTemperaturam } from "./prompt"
import type { Oraculum, Responsum, Rogatio, ValorCrudus } from "./types"

const NOMEN_INSTRUMENTI = "divine_result"

const INSTRUMENTUM: Anthropic.Tool = {
  name: NOMEN_INSTRUMENTI,
  description: "Return the single divined result value of the operation.",
  input_schema: {
    type: "object",
    properties: {
      value: { description: "The divined result: a number, text, yes/no, list, or map." },
    },
    required: ["value"],
  },
}

export class OraculumAnthropicum implements Oraculum {
  private readonly clavis = new Anthropic()

  constructor(
    private readonly exemplar: string,
    private readonly maxSigna = 1024,
  ) {}

  async divina(rogatio: Rogatio): Promise<Responsum> {
    try {
      const responsio = await this.clavis.messages.create({
        model: this.exemplar,
        max_tokens: this.maxSigna,
        temperature: restringeTemperaturam(rogatio.temperatura, 1),
        system: INSTRUCTIO_SYSTEMATIS,
        tools: [INSTRUMENTUM],
        tool_choice: { type: "tool", name: NOMEN_INSTRUMENTI },
        messages: [{ role: "user", content: construePrompt(rogatio) }],
      })
      const consumptio = {
        signaImmissa: responsio.usage.input_tokens,
        signaEmissa: responsio.usage.output_tokens,
      }
      for (const pars of responsio.content) {
        if (pars.type === "tool_use" && pars.name === NOMEN_INSTRUMENTI) {
          const input = pars.input as { value?: ValorCrudus }
          if (input && "value" in input && input.value !== undefined) {
            return { ratum: true, valor: input.value, consumptio }
          }
        }
      }
      return { ratum: false, causa: "LECTIO_FALLAX", consumptio }
    } catch {
      return { ratum: false, causa: "ERROR_ORACULI" }
    }
  }
}
