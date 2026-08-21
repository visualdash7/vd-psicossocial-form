/**
 * VD PSICOSSOCIAL
 * Cloudflare Pages Function
 *
 * POST /api/respond
 *
 * Faz a ponte:
 * Formulário Cloudflare
 *        ↓
 * Apps Script
 *        ↓
 * Google Sheets
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzqP6QTSsQbuAO6-JpUKIbSVKeVZNELHkLCdly5ydXmSceLlWNZH-9qPce1a--8e0om/exec';

const MAX_BODY_BYTES =
  50 * 1024;


export async function onRequestPost(context) {

  try {

    const { request, env } = context;


    /**
     * ==========================================================
     * CHAVE PRIVADA
     * ==========================================================
     */
    const apiKey =
      String(
        env.PUBLIC_API_KEY ||
        ''
      ).trim();


    if (!apiKey) {

      console.error(
        'PUBLIC_API_KEY ausente.'
      );

      return jsonResponse(
        {
          message:
            'Serviço temporariamente indisponível.'
        },
        503
      );
    }


    /**
     * ==========================================================
     * LIMITE DE TAMANHO DA REQUISIÇÃO
     * ==========================================================
     */
    const contentLength =
      Number(
        request.headers.get(
          'content-length'
        ) ||
        0
      );


    if (
      contentLength >
      MAX_BODY_BYTES
    ) {

      return jsonResponse(
        {
          message:
            'Dados da avaliação excedem o limite permitido.'
        },
        413
      );
    }


    /**
     * ==========================================================
     * LEITURA DO JSON
     * ==========================================================
     */
    let body;

    try {

      body =
        await request.json();

    } catch (error) {

      return jsonResponse(
        {
          message:
            'Dados da avaliação inválidos.'
        },
        400
      );
    }


    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {

      return jsonResponse(
        {
          message:
            'Dados da avaliação inválidos.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * TOKEN
     * ==========================================================
     */
    const token =
      String(
        body.token ||
        ''
      ).trim();


    if (
      !isValidToken(
        token
      )
    ) {

      return jsonResponse(
        {
          message:
            'Link da avaliação inválido ou incompleto.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * PAYLOAD
     * ==========================================================
     */
    const payload =
      body.payload;


    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {

      return jsonResponse(
        {
          message:
            'Dados da avaliação inválidos.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * RESPOSTAS
     *
     * Mantemos o formato ORIGINAL enviado pelo formulário.
     * A validação detalhada fica no Apps Script.
     * ==========================================================
     */
    const answers =
      Array.isArray(
        payload.answers
      )
        ? payload.answers
        : [];


    /**
     * Hoje o formulário possui 30 perguntas.
     */
    if (
      answers.length !==
      30
    ) {

      return jsonResponse(
        {
          message:
            'Responda todas as perguntas.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * DADOS ORGANIZACIONAIS
     * ==========================================================
     */
    const sectorId =
      String(
        payload.setorId ||
        ''
      ).trim();


    const roleId =
      String(
        payload.funcaoId ||
        ''
      ).trim();


    const shift =
      String(
        payload.turno ||
        ''
      ).trim();


    if (
      !sectorId ||
      !roleId ||
      !shift
    ) {

      return jsonResponse(
        {
          message:
            'Informe setor, função e turno.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * CORPO ENVIADO AO APPS SCRIPT
     * ==========================================================
     */
    const appsScriptBody = {

      key:
        apiKey,

      action:
        'respond',

      token:
        token,

      payload: {

        setorId:
          sectorId,

        funcaoId:
          roleId,

        turno:
          shift,

        /**
         * IMPORTANTE:
         * Não converter com map(Number).
         * Mantém exatamente a estrutura
         * gerada pelo formulário.
         */
        answers:
          answers
      }
    };


    /**
     * ==========================================================
     * CLOUDFLARE → APPS SCRIPT
     * ==========================================================
     */
    const response =
      await fetch(
        APPS_SCRIPT_URL,
        {
          method:
            'POST',

          redirect:
            'follow',

          headers: {

            /**
             * Mantemos text/plain para evitar
             * problemas de preflight/CORS
             * com o Apps Script.
             */
            'Content-Type':
              'text/plain;charset=UTF-8',

            'Accept':
              'application/json'
          },

          body:
            JSON.stringify(
              appsScriptBody
            )
        }
      );


    /**
     * ==========================================================
     * STATUS HTTP
     * ==========================================================
     */
    if (
      !response.ok
    ) {

      console.error(
        'Apps Script status:',
        response.status
      );

      return jsonResponse(
        {
          message:
            'Não foi possível concluir a operação.'
        },
        502
      );
    }


    /**
     * ==========================================================
     * RESPOSTA DO APPS SCRIPT
     * ==========================================================
     */
    const responseText =
      await response.text();


    let result;

    try {

      result =
        JSON.parse(
          responseText
        );

    } catch (error) {

      /**
       * Não registramos o HTML completo
       * recebido para evitar exposição
       * desnecessária em logs.
       */
      console.error(
        'Apps Script retornou conteúdo não JSON.'
      );

      return jsonResponse(
        {
          message:
            'Não foi possível concluir a operação.'
        },
        502
      );
    }


    /**
     * ==========================================================
     * ERRO RETORNADO PELO BACKEND
     * ==========================================================
     */
    if (
      !result?.success
    ) {

      return jsonResponse(
        {
          message:
            result?.message ||
            'Não foi possível salvar a avaliação.'
        },
        400
      );
    }


    /**
     * ==========================================================
     * SUCESSO
     * ==========================================================
     */
    return jsonResponse(
      result.data || {
        success:
          true,

        message:
          'Avaliação enviada com sucesso.'
      },
      200
    );


  } catch (error) {

    console.error(
      'respond.js:',
      error?.message ||
      error
    );


    return jsonResponse(
      {
        message:
          'Não foi possível concluir a operação.'
      },
      500
    );
  }
}


/**
 * ============================================================
 * VALIDAÇÃO DO TOKEN
 *
 * Os tokens atuais possuem 40 caracteres hexadecimais.
 * ============================================================
 */
function isValidToken(token) {

  return /^[a-f0-9]{40}$/i.test(
    String(
      token ||
      ''
    )
  );
}


/**
 * ============================================================
 * RESPOSTA JSON
 * ============================================================
 */
function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(
      data
    ),
    {
      status,

      headers: {

        'Content-Type':
          'application/json; charset=UTF-8',

        'Cache-Control':
          'no-store',

        'X-Content-Type-Options':
          'nosniff'
      }
    }
  );
}
