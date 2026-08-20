/**
 * Modal to create a new Company (Ordinacija) – used next to company dropdown in MemberForm.
 */
import React, { useMemo } from 'react';
import { Modal, Form, Input, Select, ConfigProvider } from 'antd';
import { useAddCompany } from '../../hooks/useCompanies';
import { useCities } from '../../hooks/useMembers';

export default function CompanyCreateModal({ open, onClose, onCreated, memberId }) {
  const [form] = Form.useForm();
  const addCompany = useAddCompany();
  const { data: cities = [] } = useCities();

  const cityOptions = useMemo(() => {
    if (!Array.isArray(cities)) return [];
    return cities.map((c) => ({ value: c.id, label: c.name || c.label }));
  }, [cities]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const company = await addCompany.mutateAsync({
        name: values.name,
        pib: values.pib || null,
        address: values.address || null,
        phone: values.phone || null,
        status: values.status || null,
        city_id: values.city_id || null,
        user_id: memberId || null, // memberId parameter is actually a user ID now
      });
      form.resetFields();
      onCreated?.(company);
      onClose?.();
    } catch (e) {
      if (e?.errorFields) return; // validation
      throw e;
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose?.();
  };

  return (
    <Modal
      title="Dodaj ordinaciju"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={addCompany.isPending}
      okText="Dodaj"
      cancelText="Odustani"
      destroyOnClose
    >
      <ConfigProvider
        theme={{ components: { Form: { itemMarginBottom: 12, verticalLabelPadding: '0 0 4px' } } }}
      >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item name="name" label="Naziv ustanove" rules={[{ required: true }]}>
          <Input placeholder="Unesite naziv ustanove" />
        </Form.Item>
        <Form.Item name="pib" label="PIB">
          <Input placeholder="Poreski identifikacioni broj" />
        </Form.Item>
        <Form.Item name="city_id" label="Grad">
          <Select options={cityOptions} placeholder="Izaberite grad" showSearch optionFilterProp="label" allowClear />
        </Form.Item>
        <Form.Item name="address" label="Adresa">
          <Input placeholder="Adresa" />
        </Form.Item>
        <Form.Item name="phone" label="Telefon">
          <Input placeholder="Broj telefona" />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Input placeholder="Status" />
        </Form.Item>
      </Form>
      </ConfigProvider>
    </Modal>
  );
}
