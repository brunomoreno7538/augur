import OpenAI from "openai"
import { construePrompt, INSTRUCTIO_SYSTEMATIS, restringeTemperaturam } from "./prompt"
import type { Oraculum, Responsum, Rogatio, ValorCrudus } from "./types"

export class OraculumOpenAI implements Oraculum {
  private readonly clavis = new OpenAI()

  constructor(
    private readonly exemplar: string,
    private readonly maxSigna = 1024,
  ) {}

  async divina(rogatio: Rogatio): Promise<Responsum> {
    try {
      const responsio = await this.clavis.chat.completions.create({
        model: this.exemplar,
        max_tokens: this.maxSigna,
        temperature: restringeTemperaturam(rogatio.temperatura, 2),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${INSTRUCTIO_SYSTEMATIS} Respond ONLY with a JSON object of the form {"value": <result>}.`,
          },
          { role: "user", content: construePrompt(rogatio) },
        ],
      })
      const consumptio = {
        signaImmissa: responsio.usage?.prompt_tokens ?? 0,
        signaEmissa: responsio.usage?.completion_tokens ?? 0,
      }
      const textus = responsio.choices[0]?.message.content
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
