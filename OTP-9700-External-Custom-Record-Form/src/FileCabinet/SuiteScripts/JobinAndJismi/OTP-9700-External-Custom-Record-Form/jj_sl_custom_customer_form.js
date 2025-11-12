/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/************************************************************************************************ 
 *  
 * OTP-9700 : Customer Enquiry Capture
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Suitelet to display a customer enquiry form and save submitted data to a custom record.
 * 
 * REVISION HISTORY
 *
 * @version 1.0
 * 
*************************************************************************************************/

define(['N/ui/serverWidget', 'N/record', 'N/log'], function (serverWidget, record, log) {

  /**
   * Builds and returns the customer enquiry form.
   * @returns {serverWidget.Form} NetSuite form object
   */
  function buildForm() {
    try {
      const form = serverWidget.createForm({ title: 'Customer Enquiry Form' });

      form.addField({
        id: 'custpage_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Customer Name'
      }).isMandatory = true;

      form.addField({
        id: 'custpage_email',
        type: serverWidget.FieldType.EMAIL,
        label: 'Customer Email'
      }).isMandatory = true;

      form.addField({
        id: 'custpage_subject',
        type: serverWidget.FieldType.TEXT,
        label: 'Subject'
      }).isMandatory = true;

      form.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.TEXTAREA,
        label: 'Message'
      }).isMandatory = true;

      form.addSubmitButton({ label: 'Submit Enquiry' });

      return form;
    } catch (error) {
      log.error({ title: 'buildForm Error', details: error.message });
      throw error;
    }
  }

  /**
   * Creates a custom enquiry record using submitted form data.
   * @param {Object} params - Form parameters containing name, email, subject, and message
   * @returns {number|null} Internal ID of the created record or null on failure
   */
  function createEnquiryRecord(params) {
    try {
      const enquiry = record.create({
        type: 'customrecord_jj_custom_customer_record',
        isDynamic: true
      });

      enquiry.setValue({ fieldId: 'custrecord_jj_customer_name', value: params.name });
      enquiry.setValue({ fieldId: 'custrecord_jj_customer_email', value: params.email });
      enquiry.setValue({ fieldId: 'custrecord_jj_subject', value: params.subject });
      enquiry.setValue({ fieldId: 'custrecord_jj_message', value: params.message });

      const enquiryId = enquiry.save();
      log.audit({ title: 'Enquiry Created', details: `Record ID: ${enquiryId}` });

      return enquiryId;
    } catch (error) {
      log.error({ title: 'createEnquiryRecord Error', details: error.message });
      return null;
    }
  }

  /**
   * Handles Suitelet request and response logic.
   * @param {Object} context - Suitelet context object
   */
  function onRequest(context) {
    try {
      if (context.request.method === 'GET') {
        context.response.writePage(buildForm());
      } else {
        const params = {
          name: context.request.parameters.custpage_name,
          email: context.request.parameters.custpage_email,
          subject: context.request.parameters.custpage_subject,
          message: context.request.parameters.custpage_message
        };

        const enquiryId = createEnquiryRecord(params);

        if (enquiryId) {
          context.response.write(`Thank you! Your enquiry has been submitted. Reference ID: ${enquiryId}`);
        } else {
          context.response.write('An error occurred while saving your enquiry. Please try again.');
        }
      }
    } catch (error) {
      log.error({ title: 'onRequest Error', details: error.message });
      context.response.write('An unexpected error occurred. Please try again later.');
    }
  }

  return {
    onRequest: onRequest
  };
});
