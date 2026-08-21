/**
 * VD PSICOSSOCIAL
 * Cloudflare Pages Function
 *
 * GET /api/campaign?token=TOKEN_DA_CAMPANHA
 *
 * Faz a ponte:
 * Formulário Cloudflare
 *        ↓
 * Apps Script
 *        ↓
 * Google Sheets
 */

export async function onRequestGet(context) {

  try {

    const { request, env } = context;

    const url =
      new URL(request.url);

    const token =
      String(
        url.searchParams.get('token') ||
        ''
      ).trim();


    /**
     * Verifica se veio o token da campanha.
     */
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
     * URL do Apps Script.
     *
     * A URL não é segredo.
     * A segurança ficará na PUBLIC_API_KEY.
     */
    const appsScriptUrl =
      'https://script.google.com/macros/s/AKfycbzqP6QTSsQbuAO6-JpUKIbSVKeVZNELHkLCdly5ydXmSceLlWNZH-9qPce1a--8e0om/exec';


    /**
     * A chave será cadastrada depois
     * nas variáveis do Cloudflare.
     *
     * Ela NÃO fica exposta no navegador.
     */
    const apiKey =
      env.PUBLIC_API_KEY;


    if (!apiKey) {

      throw new Error(
        'PUBLIC_API_KEY não configurada no Cloudflare.'
      );
    }


    /**
     * Monta a chamada para o Apps Script.
     */
    const endpoint =
      new URL(
        appsScriptUrl
      );


    endpoint.searchParams.set(
      'api',
      'campaign'
    );


    endpoint.searchParams.set(
      'token',
      token
    );


    endpoint.searchParams.set(
      'key',
      apiKey
    );


    /**
     * Cloudflare → Apps Script
     */
    const response =
      await fetch(
        endpoint.toString(),
        {
          method: 'GET',

          redirect:
            'follow',

          headers: {
            'Accept':
              'application/json'
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        'O servidor da avaliação não respondeu corretamente.'
      );
    }


    const result =
      await response.json();


    /**
     * O Apps Script retorna:
     *
     * {
     *   success: true,
     *   data: {...}
     * }
     */
    if (!result.success) {

      return jsonResponse(
        {
          message:
            result.message ||
            'Não foi possível carregar esta avaliação.'
        },
        400
      );
    }


    /**
     * O index.html espera receber
     * diretamente os dados da campanha.
     */
    return jsonResponse(
      result.data,
      200
    );


  } catch (error) {

    console.error(
      'campaign.js:',
      error
    );


    return jsonResponse(
      {
        message:
          error.message ||
          'Erro ao carregar a avaliação.'
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
