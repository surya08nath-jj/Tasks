/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/***********************************************************************************************
 *
 * Suitelet: University List Viewer
 * 
 * Description:
 * This Suitelet displays a form with a country dropdown. Upon submission, it fetches university
 * data from an external API and displays the results in a sublist.
 * 
 * Author: Jobin & Jismi IT Services
 * Created: 13-Nov-2025
 * Version: 1.0
 *
 ***********************************************************************************************/

define(['N/ui/serverWidget', 'N/http', 'N/log'], (ui, http, log) => {

  /**
   * Handles Suitelet request and response.
   * @param {Object} context - Suitelet context object
   * @param {ServerRequest} context.request - Incoming request object
   * @param {ServerResponse} context.response - Outgoing response object
   */
  const onRequest = (context) => {
    try {
      const request = context.request;
      const response = context.response;

      const form = ui.createForm({ title: 'University List' });

      // Country dropdown
      const countryField = form.addField({
        id: 'custpage_country',
        type: ui.FieldType.SELECT,
        label: 'Country'
      });
      countryField.isMandatory = true;
      countryField.addSelectOption({ value: '', text: '--Select--' });
      countryField.addSelectOption({ value: 'India', text: 'India' });
      countryField.addSelectOption({ value: 'China', text: 'China' });
      countryField.addSelectOption({ value: 'Japan', text: 'Japan' });

      form.addSubmitButton({ label: 'Submit' });

      // If form is submitted
      if (request.method === 'POST') {
        const selectedCountry = request.parameters.custpage_country;

        try {
          const apiUrl = 'http://universities.hipolabs.com/search?country=' + encodeURIComponent(selectedCountry);

          const apiResponse = http.get({
            url: apiUrl,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          let universities = [];
          try {
            universities = JSON.parse(apiResponse.body);
          } catch (parseError) {
            log.error('JSON Parse Error', parseError.message);
            form.addField({
              id: 'custpage_error',
              type: ui.FieldType.INLINEHTML,
              label: 'Error'
            }).defaultValue = `<div style="color:red;">Error parsing API response: ${parseError.message}</div>`;
            response.writePage(form);
            return;
          }

          if (Array.isArray(universities) && universities.length > 0) {
            const sublist = form.addSublist({
              id: 'custpage_university_list',
              type: ui.SublistType.LIST,
              label: 'Universities'
            });

            sublist.addField({
              id: 'custpage_country_name',
              type: ui.FieldType.TEXT,
              label: 'Country Name'
            });

            sublist.addField({
              id: 'custpage_state',
              type: ui.FieldType.TEXT,
              label: 'State/Province'
            });

            sublist.addField({
              id: 'custpage_webpage',
              type: ui.FieldType.URL,
              label: 'Web Page'
            });

            for (let i = 0; i < universities.length && i < 1000; i++) {
              const uni = universities[i];

              const countryName = uni.country || 'N/A';
              const state = uni['state-province'] || 'N/A';
              const webPage = Array.isArray(uni.web_pages) && uni.web_pages[0] ? uni.web_pages[0] : 'https://example.com';

              sublist.setSublistValue({
                id: 'custpage_country_name',
                line: i,
                value: countryName
              });

              sublist.setSublistValue({
                id: 'custpage_state',
                line: i,
                value: state
              });

              sublist.setSublistValue({
                id: 'custpage_webpage',
                line: i,
                value: webPage
              });
            }
          } else {
            form.addField({
              id: 'custpage_error',
              type: ui.FieldType.INLINEHTML,
              label: 'Error'
            }).defaultValue = `<div style="color:red;">No universities found for ${selectedCountry}.</div>`;
          }
        } catch (apiError) {
          log.error('Suitelet Error', apiError.message);
          form.addField({
            id: 'custpage_error',
            type: ui.FieldType.INLINEHTML,
            label: 'Error'
          }).defaultValue = `<div style="color:red;">Error fetching data: ${apiError.message}</div>`;
        }
      }

      response.writePage(form);
    } catch (outerError) {
      log.error('Unexpected Error', outerError.message);
      context.response.write(`Unexpected error occurred: ${outerError.message}`);
    }
  };

  return {
    onRequest
  };
});
