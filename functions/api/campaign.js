/**
 * VD PSICOSSOCIAL
 * Cloudflare Pages Function
 *
 * GET /api/campaign?token=TOKEN
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzqP6QTSsQbuAO6-JpUKIbSVKeVZNELHkLCdly5ydXmSceLlWNZH-9qPce1a--8e0om/exec';

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


    if (!isValidToken(token)) {

      return jsonResponse(
        {
          message:
            'Link da avaliação inválido ou incompleto.'
        },
        400
      );
    }


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


    const endpoint =
      new URL(
        APPS_SCRIPT_URL
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


    const response =
      await fetch(
        endpoint.toString(),
        {
          method:
            'GET',

          redirect:
            'follow',

          headers: {
            Accept:
              'application/json'
          }
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
            'Não foi possível carregar esta avaliação.'
        },
        502
      );
    }


    let result;

    try {

      result =
        await response.json();

    } catch (error) {

      console.error(
        'Resposta não JSON do Apps Script.'
      );

      return jsonResponse(
        {
          message:
            'Não foi possível carregar esta avaliação.'
        },
        502
      );
    }


    if (!result?.success) {

      return jsonResponse(
        {
          message:
            result?.message ||
            'Não foi possível carregar esta avaliação.'
        },
        400
      );
    }


    return jsonResponse(
      result.data,
      200
    );


  } catch (error) {

    console.error(
      'campaign.js:',
      error?.message ||
      error
    );


    return jsonResponse(
      {
        message:
          'Não foi possível carregar esta avaliação.'
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
