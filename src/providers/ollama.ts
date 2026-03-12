import { Ollama } from "ollama"
import { construePrompt, INSTRUCTIO_SYSTEMATIS } from "./prompt"
import type { Oraculum, Responsum, Rogatio, ValorCrudus } from "./types"

export class OraculumOllama implements Oraculum {
  private readonly clavis: Ollama

  constructor(
    private readonly exemplar: string,
    sedes: string = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
  ) {
    this.clavis = new Ollama({ host: sedes })
  }

  async divina(rogatio: Rogatio): Promise<Responsum> {
    try {
      const responsio = await this.clavis.chat({
        model: this.exemplar,
        format: "json",
        options: { temperature: rogatio.temperatura },
        messages: [
          {
            role: "system",
            content: `${INSTRUCTIO_SYSTEMATIS} Respond ONLY with a JSON object of the form {"value": <result>}.`,
          },
          { role: "user", content: construePrompt(rogatio) },
        ],
      })
      const consumptio = {
        signaImmissa: responsio.prompt_eval_count ?? 0,
        signaEmissa: responsio.eval_count ?? 0,
      }
      const textus = responsio.message.content
      if (!textus) return { ratum: false, causa: "LECTIO_FALLAX", consumptio }
      const datum = JSON.parse(textus) as { value?: ValorCrudus }
      if (datum && typeof datum === "object" && "value" in datum && datum.value !== undefined) {
        return { ratum: true, valor: datum.value, consumptio }
      }
      return { ratum: true, valor: datum as ValorCrudus, consumptio }
    } catch {
      return { ratum: false, causa: "ERROR_ORACULI" }
    }
  }
}
