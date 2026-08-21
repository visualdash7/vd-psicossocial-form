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

export async function onRequestPost(context) {

  try {

    const { request, env } = context;


    /**
     * Chave privada armazenada
     * nas variáveis do Cloudflare.
     */
    const apiKey =
      env.PUBLIC_API_KEY;


    if (!apiKey) {

      throw new Error(
        'PUBLIC_API_KEY não configurada no Cloudflare.'
      );
    }


    /**
     * Recebe os dados enviados pelo formulário.
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


    const token =
      String(
        body.token ||
        ''
      )
      .trim();


    const payload =
      body.payload ||
      {};


    if (!token) {

      return jsonResponse(
        {
          message:
            'Token da avaliação não informado.'
        },
        400
      );
    }


    /**
     * URL atual do Web App
     * do Gestão NR-1.
     */
    const appsScriptUrl =
      'https://script.google.com/macros/s/AKfycbzqP6QTSsQbuAO6-JpUKIbSVKeVZNELHkLCdly5ydXmSceLlWNZH-9qPce1a--8e0om/exec';


    /**
     * Corpo que será enviado
     * ao Apps Script.
     */
    const appsScriptBody = {

      key:
        apiKey,

      action:
        'respond',

      token:
        token,

      payload:
        payload
    };


    /**
     * Cloudflare → Apps Script
     */
    const response =
      await fetch(
        appsScriptUrl,
        {
          method:
            'POST',

          redirect:
            'follow',

          headers: {

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


    if (!response.ok) {

      throw new Error(
        'O servidor da avaliação não respondeu corretamente.'
      );
    }


    /**
     * Lê primeiro como texto.
     *
     * Isso facilita identificar eventual
     * resposta HTML do Google.
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

      console.error(
        'Resposta inesperada do Apps Script:',
        responseText
      );

      throw new Error(
        'O servidor retornou uma resposta inválida.'
      );
    }


    /**
     * Resultado enviado pelo doPost()
     * do Apps Script.
     */
    if (!result.success) {

      return jsonResponse(
        {
          message:
            result.message ||
            'Não foi possível salvar a avaliação.'
        },
        400
      );
    }


    /**
     * Tudo certo.
     */
    return jsonResponse(
      result.data || {
        success: true,
        message:
          'Avaliação enviada com sucesso.'
      },
      200
    );


  } catch (error) {

    console.error(
      'respond.js:',
      error
    );


    return jsonResponse(
      {
        message:
          error.message ||
          'Não foi possível concluir a operação.'
      },
      500
    );
  }
}



/**
 * Resposta JSON padronizada.
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
          'no-store'
      }
    }
  );
}
