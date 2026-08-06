/**
 * Employees list – table + side Drawer for add/edit.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Table, Input, Button, Space, Modal, Typography, message, Drawer, Spin, Form, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useEmployees,
  useEmployee,
  useAddEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useAddEmployeeContract,
} from '../../hooks/useEmployees';
import EmployeeForm from '../../components/forms/EmployeeForm';
import dayjs from 'dayjs';

const { Search } = Input;
const { Text } = Typography;

export default function EmployeeListPage() {
  const { data: employees = [], isLoading, error } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const [searchText, setSearchText] = useState('');
  const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const { data: editingItem, isLoading: loadingItem, refetch } = useEmployee(editingId);
  const addContractMutation = useAddEmployeeContract(editingId);

  useEffect(() => {
    if (!editingItem || drawerMode !== 'edit') return;
    form.setFieldsValue({
      jmbg: editingItem.jmbg,
      name: editingItem.name,
      surname: editingItem.surname,
      email: editingItem.email,
      phone: editingItem.phone,
      workplace: editingItem.workplace,
      date_of_birth: editingItem.date_of_birth ? dayjs(editingItem.date_of_birth) : null,
    });
  }, [editingItem, drawerMode, form]);

  const filteredEmployees = useMemo(() => {
    if (!searchText.trim()) return employees;
    const normalizedSearch = searchText.toLowerCase().trim();
    const searchParts = normalizedSearch.split(/\s+/).filter(Boolean);

    return employees.filter((e) => {
      const name = (e.name || '').toLowerCase().trim();
      const surname = (e.surname || '').toLowerCase().trim();
      const fullName = `${name} ${surname}`.trim();
      const reversedFullName = `${surname} ${name}`.trim();
      const email = (e.email || '').toLowerCase();
      const jmbg = e.jmbg ? String(e.jmbg) : '';
      const workplace = (e.workplace || '').toLowerCase();

      if (
        email.includes(normalizedSearch) ||
        jmbg.includes(normalizedSearch) ||
        workplace.includes(normalizedSearch)
      ) return true;

      if (searchParts.length === 1) {
        const term = searchParts[0];
        return name.includes(term) || surname.includes(term) || fullName.includes(term);
      }

      return (
        fullName.includes(normalizedSearch) ||
        reversedFullName.includes(normalizedSearch) ||
        searchParts.every((part) => fullName.includes(part))
      );
    });
  }, [employees, searchText]);

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

  const handleAddContract = async (file) => {
    await addContractMutation.mutateAsync(file);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteModal.item?.id) return;
    try {
      await deleteEmployee.mutateAsync(deleteModal.item.id);
      message.success('Zaposleni je obrisan');
      setDeleteModal({ visible: false, item: null });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const onFormFinish = async (values) => {
    try {
      const payload = {
        jmbg: values.jmbg,
        name: values.name,
        surname: values.surname,
        email: values.email,
        phone: values.phone || null,
        workplace: values.workplace || null,
        date_of_birth: values.date_of_birth
          ? values.date_of_birth.format('YYYY-MM-DD')
          : null,
        personal_id: values.personal_id,
        contracts: values.contracts,
      };
      if (drawerMode === 'add') {
        await addEmployee.mutateAsync(payload);
        message.success('Zaposleni je dodan');
      } else {
        await updateEmployee.mutateAsync({ id: editingId, ...payload });
        message.success('Podaci o zaposlenom su ažurirani');
      }
      closeDrawer();
    } catch (e) {
      message.error(e?.message || 'Greška');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, fixed: 'left' },
    { title: 'JMBG', dataIndex: 'jmbg', key: 'jmbg', width: 115 },
    { title: 'Ime', dataIndex: 'name', key: 'name', width: 110, ellipsis: true },
    { title: 'Prezime', dataIndex: 'surname', key: 'surname', width: 110, ellipsis: true },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: { showTitle: false },
      render: (email) =>
        email ? (
          <Tooltip placement="topLeft" title={email}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone', width: 115 },
    {
      title: 'Radno mjesto',
      dataIndex: 'workplace',
      key: 'workplace',
      width: 150,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Ugovori',
      key: 'contracts',
      width: 80,
      render: (_, record) => (record.contracts?.length ?? 0) || '—',
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} title="Izmijeni" />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModal({ visible: true, item: record })}
            title="Obriši"
          />
        </Space>
      ),
    },
  ];

  const formLoading = addEmployee.isPending || updateEmployee.isPending;
  const drawerContent =
    drawerMode === 'edit' && loadingItem ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    ) : (
      <EmployeeForm
        form={form}
        onFinish={onFormFinish}
        loading={formLoading}
        submitLabel={drawerMode === 'add' ? 'Dodaj' : 'Izmijeni'}
        onCancel={closeDrawer}
        editingEmployeeId={drawerMode === 'edit' ? editingId : null}
        existingPersonalId={editingItem?.personal_id}
        existingContracts={editingItem?.contracts}
        onContractAdded={handleAddContract}
        onContractRemoved={() => refetch()}
        onPersonalIdRemoved={() => refetch()}
        addContractLoading={addContractMutation?.isPending}
      />
    );

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 18 }}>
            Zaposleni
          </Text>
          <Space wrap size="small">
            <Search
              placeholder="Pretraga..."
              allowClear
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220, minWidth: 160 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
              Dodaj zaposlenog
            </Button>
          </Space>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredEmployees}
          loading={isLoading}
          scroll={{ x: 860 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t) => `Ukupno: ${t}`,
            size: 'default',
          }}
          size="small"
          locale={{ emptyText: error ? 'Greška pri učitavanju' : 'Nema zaposlenih' }}
        />
      </div>
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, item: null })}
        okText="Obriši"
        cancelText="Odustani"
        confirmLoading={deleteEmployee.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati zaposlenog: {deleteModal.item?.name} {deleteModal.item?.surname}?
      </Modal>
      <Drawer
        title={drawerMode === 'add' ? 'Dodaj zaposlenog' : 'Izmijeni zaposlenog'}
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

