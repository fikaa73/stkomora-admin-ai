/**
 * Kongres – Spisak registracija za kongres.
 * Table: ID, Ime i prezime, Zvanje, Ustanova, E-mail, Tel, Plaćeno, Rad, Akcije.
 * Uses existing congress API: list, payment toggle, delete.
 */
import React, { useMemo, useState } from 'react';
import { Table, Input, Button, Space, Modal, Checkbox, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useCongress, useCongressPayment, useDeleteCongressParticipant } from '../../hooks/useCongress';
import { getCongressFileUrl } from '../../core/api/congress';

export default function CongressListPage() {
  const { data: participants = [], isLoading, error } = useCongress();
  const paymentMutation = useCongressPayment();
  const deleteParticipant = useDeleteCongressParticipant();
  const [searchText, setSearchText] = useState('');
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null, name: '' });

  const filteredParticipants = useMemo(() => {
    if (!searchText.trim()) return participants;
    const lower = searchText.toLowerCase();
    return participants.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.email && p.email.toLowerCase().includes(lower)) ||
        (p.company && p.company.toLowerCase().includes(lower))
    );
  }, [participants, searchText]);

  const handlePaymentChange = async (record) => {
    const newPaid = record.paid === 0 || record.paid === false ? 1 : 0;
    try {
      await paymentMutation.mutateAsync({ id: record.id, payment: newPaid });
      message.success(newPaid ? 'Označeno kao plaćeno' : 'Označeno kao neplaćeno');
    } catch (e) {
      message.error(e?.message || 'Greška pri ažuriranju');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteParticipant.mutateAsync(deleteModal.id);
      message.success('Registracija je obrisana');
      setDeleteModal({ visible: false, id: null, name: '' });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      sorter: (a, b) => (a.id ?? 0) - (b.id ?? 0),
      defaultSortOrder: 'descend',
      render: (v) => v ?? '–',
    },
    {
      title: 'Ime i prezime',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (v) => v ?? '–',
    },
    {
      title: 'Zvanje',
      dataIndex: 'vocation',
      key: 'vocation',
      render: (v) => v ?? '–',
    },
    {
      title: 'Ustanova',
      dataIndex: 'company',
      key: 'company',
      render: (v) => v ?? '–',
    },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
      render: (v) => v ?? '–',
    },
    {
      title: 'Tel',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (v) => v ?? '–',
    },
    {
      title: 'Plaćeno',
      dataIndex: 'paid',
      key: 'paid',
      width: 90,
      align: 'center',
      sorter: (a, b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0),
      render: (_, record) => (
        <Checkbox
          checked={record.paid === 1 || record.paid === true}
          onChange={() => handlePaymentChange(record)}
          // Zakljucaj samo red koji se upravo upisuje - ostali ostaju klikabilni
          // da administrator moze bez cekanja da prolazi kroz izvod.
          disabled={paymentMutation.isPending && paymentMutation.variables?.id === record.id}
        />
      ),
    },
    {
      title: 'Rad',
      dataIndex: 'file',
      key: 'file',
      width: 80,
      render: (file) =>
        file ? (
          <a href={getCongressFileUrl(file)} target="_blank" rel="noopener noreferrer">
            Link
          </a>
        ) : (
          '–'
        ),
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setDeleteModal({ visible: true, id: record.id, name: record.name })}
          title="Obriši registraciju"
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Pretraga"
          allowClear
          onSearch={setSearchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
          enterButton
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredParticipants}
        loading={isLoading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (t) => `Ukupno: ${t}`,
          pageSizeOptions: ['10', '20', '50'],
        }}
        locale={{ emptyText: error ? 'Greška pri učitavanju' : 'Nema registracija' }}
        size="middle"
      />
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, id: null, name: '' })}
        okText="Obriši"
        cancelText="Odustani"
        confirmLoading={deleteParticipant.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati registraciju: {deleteModal.name}?
      </Modal>
    </div>
  );
}
