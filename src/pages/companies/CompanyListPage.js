/**
 * Companies list – table + side Drawer for add/edit.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Table, Input, Button, Space, Modal, Typography, message, Drawer, Spin, Form, Tooltip, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useCompanies,
  useCompany,
  useAddCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '../../hooks/useCompanies';
import CompanyForm from '../../components/forms/CompanyForm';

const { Search } = Input;
const { Text } = Typography;

export default function CompanyListPage() {
  const { data: companies = [], isLoading, error } = useCompanies();
  const deleteCompany = useDeleteCompany();
  const addCompany = useAddCompany();
  const updateCompany = useUpdateCompany();
  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const { data: editingItem, isLoading: loadingItem } = useCompany(editingId);

  useEffect(() => {
    if (!editingItem || drawerMode !== 'edit') return;
    form.setFieldsValue({
      name: editingItem.name,
      pib: editingItem.pib,
      address: editingItem.address,
      phone: editingItem.phone,
      status: editingItem.status,
      city_id: editingItem.city?.id ?? editingItem.city_id,
      user_id: editingItem.user_id ?? editingItem.user?.id ?? editingItem.member?.id ?? editingItem.member_id,
    });
  }, [editingItem, drawerMode, form]);

  /* Build city filter options from loaded data */
  const cityOptions = useMemo(() => {
    const cities = new Map();
    companies.forEach((c) => {
      if (c.city?.id && c.city?.name) {
        cities.set(c.city.id, c.city.name);
      }
    });
    const sorted = [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { value: 'all', label: 'Svi gradovi' },
      ...sorted.map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    let result = companies;
    if (cityFilter !== 'all') {
      result = result.filter((c) => c.city?.id === cityFilter);
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.pib && c.pib.toLowerCase().includes(lower)) ||
          (c.address && c.address.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower)) ||
          (c.user?.name && c.user.name.toLowerCase().includes(lower)) ||
          (c.user?.surname && c.user.surname.toLowerCase().includes(lower)) ||
          (c.member?.name && c.member.name.toLowerCase().includes(lower)) ||
          (c.member?.surname && c.member.surname.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [companies, searchText, cityFilter]);

  const openAddDrawer = () => {
    setDrawerMode('add');
    setEditingId(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditDrawer = (record) => {
    setDrawerMode('edit');
    setEditingId(record.id);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleDelete = async () => {
    if (!deleteModal.item?.id) return;
    try {
      await deleteCompany.mutateAsync(deleteModal.item.id);
      message.success('Ordinacija je obrisana');
      setDeleteModal({ visible: false, item: null });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const onFormFinish = async (values) => {
    try {
      const payload = {
        name: values.name,
        pib: values.pib || null,
        address: values.address || null,
        phone: values.phone || null,
        status: values.status || null,
        city_id: values.city_id || null,
        user_id: (values.user_id ?? values.member_id) || null,
      };
      if (drawerMode === 'add') {
        await addCompany.mutateAsync(payload);
        message.success('Ordinacija je dodana');
      } else {
        await updateCompany.mutateAsync({ id: editingId, ...payload });
        message.success('Ordinacija je ažurirana');
      }
      closeDrawer();
    } catch (e) {
      message.error(e?.message || 'Greška');
    }
  };

  const columns = [
    {
      title: 'Naziv',
      dataIndex: 'name',
      key: 'name',
      ellipsis: { showTitle: false },
      render: (name) =>
        name ? (
          <Tooltip placement="topLeft" title={name}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          </Tooltip>
        ) : (
          '–'
        ),
    },
    {
      title: 'PIB',
      dataIndex: 'pib',
      key: 'pib',
      width: 120,
      responsive: ['md'],
      render: (v) => v || '–',
    },
    {
      title: 'Adresa',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      responsive: ['md'],
      render: (v) => v || '–',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      responsive: ['lg'],
      render: (v) => v || '–',
    },
    {
      title: 'Grad',
      key: 'city',
      width: 120,
      render: (_, r) => r.city?.name || '–',
    },
    {
      title: 'Stomatolog',
      key: 'user',
      width: 160,
      ellipsis: true,
      responsive: ['lg'],
      render: (_, r) =>
        r.user ? `${r.user.name || ''} ${r.user.surname || ''}`.trim() : 
        r.member ? `${r.member.name || ''} ${r.member.surname || ''}`.trim() : '–',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      responsive: ['xl'],
      render: (v) => v || '–',
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} title="Izmijeni" />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModal({ visible: true, item: record })}
            title="Obriši"
          />
        </Space>
      ),
    },
  ];

  const formLoading = addCompany.isPending || updateCompany.isPending;
  const drawerContent =
    drawerMode === 'edit' && loadingItem ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    ) : (
      <CompanyForm
        form={form}
        onFinish={onFormFinish}
        loading={formLoading}
        submitLabel={drawerMode === 'add' ? 'Dodaj' : 'Izmijeni'}
        onCancel={closeDrawer}
      />
    );

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text strong style={{ fontSize: 18 }}>
          Ordinacije (ustanove)
        </Text>
        <Space wrap size="small">
          <Select
            value={cityFilter}
            onChange={setCityFilter}
            style={{ width: 160 }}
            options={cityOptions}
            showSearch
            optionFilterProp="label"
          />
          <Search
            placeholder="Pretraga..."
            allowClear
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220, minWidth: 160 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
            Dodaj ordinaciju
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredCompanies}
        loading={isLoading}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          showTotal: (t) => `Ukupno: ${t}`,
          size: 'default',
        }}
        size="small"
        locale={{ emptyText: error ? 'Greška pri učitavanju' : 'Nema ordinacija' }}
        style={{ overflowX: 'auto' }}
      />
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, item: null })}
        okText="Obriši"
        cancelText="Odustani"
        confirmLoading={deleteCompany.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati ordinaciju: {deleteModal.item?.name}?
      </Modal>
      <Drawer
        title={drawerMode === 'add' ? 'Dodaj ordinaciju' : 'Izmijeni ordinaciju'}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {drawerContent}
      </Drawer>
    </div>
  );
}
