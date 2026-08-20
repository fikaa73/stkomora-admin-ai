/**
 * Company form fields – used inside Drawer (add/edit).
 */
import React, { useMemo } from 'react';
import { Form, Input, Select, Button, ConfigProvider } from 'antd';
import { useCities } from '../../hooks/useMembers';
import { useMembers } from '../../hooks/useMembers';

export default function CompanyForm({
  form,
  onFinish,
  loading,
  submitLabel = 'Sačuvaj',
  cancelLabel = 'Odustani',
  onCancel,
}) {
  const { data: cities = [] } = useCities();
  const { data: members = [] } = useMembers();

  const cityOptions = useMemo(() => {
    if (!Array.isArray(cities)) return [];
    return cities.map((c) => ({ value: c.id, label: c.name || c.label }));
  }, [cities]);

  const memberOptions = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members.map((m) => ({
      value: m.id,
      label: `${m.name || ''} ${m.surname || ''}`.trim() || `Član #${m.id}`,
    }));
  }, [members]);

  return (
    <ConfigProvider
      theme={{ components: { Form: { itemMarginBottom: 12, verticalLabelPadding: '0 0 4px' } } }}
    >
    <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
      <Form.Item name="name" label="Naziv ustanove" rules={[{ required: true, message: 'Unesite naziv' }]}>
        <Input placeholder="Unesite naziv ustanove" />
      </Form.Item>
      <Form.Item name="pib" label="PIB">
        <Input placeholder="Poreski identifikacioni broj" />
      </Form.Item>
      <Form.Item name="city_id" label="Grad">
        <Select
          options={cityOptions}
          placeholder="Izaberite grad"
          showSearch
          optionFilterProp="label"
          allowClear
        />
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
      <Form.Item name="user_id" label="Stomatolog (vlasnik)">
        <Select
          options={memberOptions}
          placeholder="Izaberite stomatologa"
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
          {submitLabel}
        </Button>
        {onCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
      </Form.Item>
    </Form>
    </ConfigProvider>
  );
}
