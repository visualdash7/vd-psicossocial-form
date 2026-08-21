/**
 * VD PSICOSSOCIAL
 * Cloudflare Pages Function
 *
 * POST /api/respond
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzqP6QTSsQbuAO6-JpUKIbSVKeVZNELHkLCdly5ydXmSceLlWNZH-9qPce1a--8e0om/exec';

const MAX_BODY_BYTES =
  50 * 1024;

export async function onRequestPost(context) {

  try {

    const { request, env } = context;


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
      typeof body !==
        'object' ||
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


    const token =
      String(
        body.token ||
        ''
      ).trim();


    if (!isValidToken(token)) {

      return jsonResponse(
        {
          message:
            'Link da avaliação inválido ou incompleto.'
        },
        400
      );
    }


    const payload =
      body.payload;


    if (
      !payload ||
      typeof payload !==
        'object' ||
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
     * Cada resposta deve estar
     * entre 1 e 5.
     */
    const validAnswers =
      answers.every(
        value => {

          const n =
            Number(value);

          return (
            Number.isInteger(n) &&
            n >= 1 &&
            n <= 5
          );
        }
      );


    if (!validAnswers) {

      return jsonResponse(
        {
          message:
            'Uma ou mais respostas são inválidas.'
        },
        400
      );
    }


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

        answers:
          answers.map(Number)
      }
    };


    const response =
      await fetch(
        APPS_SCRIPT_URL,
        {
          method:
            'POST',

          redirect:
            'follow',

          headers: {
            'Content-Type':
              'text/plain;charset=UTF-8',

            Accept:
              'application/json'
          },

          body:
            JSON.stringify(
              appsScriptBody
            )
        }
      );


    if (!response.ok) {

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
       * Não gravamos o HTML completo
       * recebido para evitar logs
       * excessivos ou exposição desnecessária.
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


    if (!result?.success) {

      return jsonResponse(
        {
          message:
            result?.message ||
            'Não foi possível salvar a avaliação.'
        },
        400
      );
    }


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


function isValidToken(token) {

  return /^[a-f0-9]{40}$/i.test(
    String(
      token ||
      ''
    )
  );
}


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
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
