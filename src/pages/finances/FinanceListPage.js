/**
 * Finances list – table + side Drawer for add/edit + details drawer.
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  Table, Input, Button, Space, Modal, Typography, message,
  Drawer, Spin, Form, Select, Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  useFinances,
  useFinance,
  useAddFinance,
  useUpdateFinance,
  useDeleteFinance,
  useMemberFinanceDetails,
  useFinanceProcessors,
  useReportPeriods,
} from '../../hooks/useFinances';
import { financesApi } from '../../core/api/finances';
import { useMembers, useUpdateMemberNapomena } from '../../hooks/useMembers';
import FinanceForm from '../../components/forms/FinanceForm';
import ExemptionSection from '../../components/finances/ExemptionSection';

const { Search } = Input;
const { Text } = Typography;

function fmtMoney(v) {
  const n = Number(v);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

/* Broj(evi) licence člana – iz relacije licenses ili legacy licence stringa. */
function licenseOf(user) {
  if (!user) return '';
  const rel = Array.isArray(user.licenses)
    ? user.licenses.map((l) => l?.license_number || l?.licence).filter(Boolean)
    : [];
  if (rel.length) return [...new Set(rel)].join(', ');
  return user.licence || user.license_number || '';
}

/* UTF-8 PDF font (same origin to avoid 403) – postinstall copies to public/fonts */
const PDF_FONT_URL = `${process.env.PUBLIC_URL || ''}/fonts/DejaVuSans.ttf`;
let pdfFontBase64Cache = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function getPdfFontBase64() {
  if (pdfFontBase64Cache) return pdfFontBase64Cache;
  const res = await fetch(PDF_FONT_URL);
  if (!res.ok) throw new Error('Font load failed');
  const buffer = await res.arrayBuffer();
  pdfFontBase64Cache = arrayBufferToBase64(buffer);
  return pdfFontBase64Cache;
}

function applyPdfFont(doc) {
  if (!pdfFontBase64Cache) return;
  doc.addFileToVFS('DejaVuSans.ttf', pdfFontBase64Cache);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.setFont('DejaVuSans', 'normal');
}

const PDF_LOGO_URL = `${process.env.PUBLIC_URL || ''}/logo.png`;
const PDF_LOGO_URL_JPG = `${process.env.PUBLIC_URL || ''}/logo.jpg`;
const PDF_LOGO_SIZE_MM = 20;
const PDF_LOGO_LEFT_MM = 14;
const PDF_LOGO_TOP_MM = 8;
const PDF_HEADER_TO_SUBTITLE_GAP_MM = 14;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PDF_RIGHT_MARGIN_MM = 14;
const PDF_APPROVAL_LINE_WIDTH_MM = 35;
const PDF_CHAMBER_TITLE = 'Stomatološka komora Crne Gore';

/* Match Ant Design danger / success used in the details drawer */
const PDF_COLOR_DEBT_RGB = [207, 19, 34];
const PDF_COLOR_CREDIT_RGB = [56, 158, 13];
const PDF_COLOR_DEBT_BANNER_FILL = [255, 242, 240];
const PDF_COLOR_CREDIT_BANNER_FILL = [246, 255, 237];
const PDF_COLOR_NEUTRAL_BANNER_FILL = [250, 250, 250];

async function getPdfLogoDataUrl() {
  for (const url of [PDF_LOGO_URL, PDF_LOGO_URL_JPG]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      continue;
    }
  }
  return null;
}

/* ───── Details Drawer Content ───── */
function MemberDetailsContent({ memberId, memberName = '' }) {
  const { data, isLoading } = useMemberFinanceDetails(memberId);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Napomena o stomatologu – editabilna iz finansija.
  const updateNapomena = useUpdateMemberNapomena();
  const [note, setNote] = useState('');
  useEffect(() => {
    setNote(data?.napomena ?? '');
  }, [memberId, data?.napomena]);

  const handleSaveNote = async () => {
    try {
      await updateNapomena.mutateAsync({ id: memberId, napomena: note.trim() || null });
      message.success('Napomena je sačuvana');
    } catch (e) {
      message.error(e?.message || 'Greška pri čuvanju napomene');
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      let fontOk = false;
      try {
        await getPdfFontBase64();
        fontOk = true;
      } catch (fontErr) {
        console.warn('PDF font not loaded, using default font:', fontErr);
      }
      let logoDataUrl = null;
      try {
        logoDataUrl = await getPdfLogoDataUrl();
      } catch {
        logoDataUrl = null;
      }
      const doc = new jsPDF();
      if (fontOk) applyPdfFont(doc);
      const subtitle = `Finansijska kartica – ${memberName || 'Član'}`;
      let subtitleY = 20;
      const chamberTitleX = PDF_LOGO_LEFT_MM + PDF_LOGO_SIZE_MM + 5;
      const chamberTitleY = PDF_LOGO_TOP_MM + PDF_LOGO_SIZE_MM / 2 + 2;
      if (logoDataUrl) {
        try {
          const format = logoDataUrl.indexOf('image/png') !== -1 ? 'PNG' : 'JPEG';
          doc.addImage(logoDataUrl, format, PDF_LOGO_LEFT_MM, PDF_LOGO_TOP_MM, PDF_LOGO_SIZE_MM, PDF_LOGO_SIZE_MM);
          doc.setFontSize(14);
          if (fontOk) doc.setFont('DejaVuSans', 'normal');
          doc.text(PDF_CHAMBER_TITLE, chamberTitleX, chamberTitleY);
          subtitleY = PDF_LOGO_TOP_MM + PDF_LOGO_SIZE_MM + PDF_HEADER_TO_SUBTITLE_GAP_MM;
        } catch {
          doc.setFontSize(12);
          doc.text(PDF_CHAMBER_TITLE, PDF_LOGO_LEFT_MM, 12);
        }
      } else {
        doc.setFontSize(12);
        doc.text(PDF_CHAMBER_TITLE, PDF_LOGO_LEFT_MM, 12);
      }
      doc.setFontSize(16);
      doc.text(subtitle, PDF_LOGO_LEFT_MM, subtitleY);
      const dateStr = dayjs().format('DD.MM.YYYY');
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(dateStr, PDF_LOGO_LEFT_MM, subtitleY + 7);
      doc.setTextColor(0, 0, 0);
      const tableStartY = subtitleY + 14;
      const tableData = (data.records || []).map((r) => {
        const d = Number(r.duguje);
        const p = Number(r.potrazuje);
        return [
          r.date ? dayjs(r.date).format('DD.MM.YYYY') : '–',
          (r.description || '–').substring(0, 50),
          {
            content: fmtMoney(r.duguje),
            styles: {
              halign: 'right',
              textColor: d > 0 ? PDF_COLOR_DEBT_RGB : [0, 0, 0],
            },
          },
          {
            content: fmtMoney(r.potrazuje),
            styles: {
              halign: 'right',
              textColor: p > 0 ? PDF_COLOR_CREDIT_RGB : [0, 0, 0],
            },
          },
        ];
      });
      autoTable(doc, {
        head: [[
          { content: 'Datum' },
          { content: 'Opis' },
          { content: 'Duguje', styles: { halign: 'right' } },
          { content: 'Potražuje', styles: { halign: 'right' } },
        ]],
        body: tableData,
        startY: tableStartY,
        styles: { fontSize: 9, ...(fontOk ? { font: 'DejaVuSans' } : {}) },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      });
      const finalY = doc.lastAutoTable?.finalY ?? tableStartY;
      const totalNum = Number(data.total);
      const bannerTop = finalY + 4;
      const bannerH = 11;
      const bannerW = PDF_PAGE_WIDTH_MM - PDF_LOGO_LEFT_MM - PDF_RIGHT_MARGIN_MM;
      if (totalNum > 0) {
        doc.setFillColor(...PDF_COLOR_DEBT_BANNER_FILL);
        doc.setDrawColor(255, 204, 199);
      } else if (totalNum < 0) {
        doc.setFillColor(...PDF_COLOR_CREDIT_BANNER_FILL);
        doc.setDrawColor(183, 235, 143);
      } else {
        doc.setFillColor(...PDF_COLOR_NEUTRAL_BANNER_FILL);
        doc.setDrawColor(240, 240, 240);
      }
      doc.rect(PDF_LOGO_LEFT_MM, bannerTop, bannerW, bannerH, 'FD');
      doc.setFontSize(11);
      if (fontOk) doc.setFont('DejaVuSans', 'normal');
      if (totalNum > 0) {
        doc.setTextColor(...PDF_COLOR_DEBT_RGB);
      } else if (totalNum < 0) {
        doc.setTextColor(...PDF_COLOR_CREDIT_RGB);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(
        `Ukupno: ${fmtMoney(data.total)} €`,
        PDF_PAGE_WIDTH_MM - PDF_RIGHT_MARGIN_MM,
        bannerTop + bannerH - 3,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
      const approvalY = PDF_PAGE_HEIGHT_MM - 48;
      const lineY = approvalY + 6;
      const rightX = PDF_PAGE_WIDTH_MM - PDF_RIGHT_MARGIN_MM;
      doc.setFontSize(10);
      doc.text('Odobrio', rightX, approvalY, { align: 'right' });
      doc.setLineWidth(0.3);
      doc.line(rightX - PDF_APPROVAL_LINE_WIDTH_MM, lineY, rightX, lineY);
      doc.save(`finansije-${(memberName || 'clan').replace(/\s+/g, '-')}.pdf`);
    } catch (e) {
      message.error('Preuzimanje PDF-a nije uspjelo. Pokušajte ponovo.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const title = `Finansijska kartica – ${memberName || 'Član'}`;
    const thead = '<tr><th>Datum</th><th>Opis</th><th style="text-align:right">Duguje</th><th style="text-align:right">Potražuje</th></tr>';
    const tbody = (data.records || [])
      .map((r) => {
        const d = Number(r.duguje);
        const p = Number(r.potrazuje);
        const dStyle = d > 0 ? 'color:#cf1322;font-weight:600' : '';
        const pStyle = p > 0 ? 'color:#389e0d;font-weight:600' : '';
        return `<tr><td>${r.date ? dayjs(r.date).format('DD.MM.YYYY') : '–'}</td><td>${(r.description || '–').replace(/</g, '&lt;')}</td><td style="text-align:right;${dStyle}">${fmtMoney(r.duguje)}</td><td style="text-align:right;${pStyle}">${fmtMoney(r.potrazuje)}</td></tr>`;
      })
      .join('');
    const total = fmtMoney(data.total);
    const totalNum = Number(data.total);
    let totalBoxStyle =
      'margin-top:12px;padding:12px 16px;border-radius:8px;text-align:right;font-weight:600;font-size:15px;';
    if (totalNum > 0) {
      totalBoxStyle += 'background:#fff2f0;border:1px solid #ffccc7;color:#cf1322;';
    } else if (totalNum < 0) {
      totalBoxStyle += 'background:#f6ffed;border:1px solid #b7eb8f;color:#389e0d;';
    } else {
      totalBoxStyle += 'background:#fafafa;border:1px solid #f0f0f0;';
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const logoUrl = `${window.location.origin}${process.env.PUBLIC_URL || ''}/logo.png`;
    const chamberTitle = 'Stomatološka komora Crne Gore';
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page{size:A4;margin:15mm}
        body{font-family:system-ui,sans-serif;padding:16px;color:#333;margin:0}
        .pdf-header{display:flex;align-items:center;gap:20px;margin-bottom:20px} .pdf-header .logo{width:80px;height:80px;object-fit:contain;flex-shrink:0} .pdf-header .chamber-title{font-size:1.1rem;font-weight:600;color:#262626;margin:0;line-height:1.3}
        .subtitle{font-size:1.25rem;margin:0 0 6px 0;font-weight:600} .doc-date{font-size:0.95rem;color:#555;margin:0 0 14px 0;letter-spacing:0.02em}
        table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px} th{background:#fafafa;font-weight:600}
        .approval{margin-top:160px;text-align:right} .approval .label{font-size:0.95rem;margin-bottom:6px} .approval .line{border-bottom:1px solid #333;width:140px;margin-left:auto;margin-top:4px;height:1.2em}
      </style>
      </head><body><div class="pdf-header"><img src="${logoUrl}" class="logo" alt="" onerror="this.style.display='none'"><p class="chamber-title">${chamberTitle}</p></div><h2 class="subtitle">${title}</h2><p class="doc-date">${dayjs().format('DD.MM.YYYY')}</p><table><thead>${thead}</thead><tbody>${tbody}</tbody></table><div style="${totalBoxStyle}">Ukupno: ${total} €</div><div class="approval"><div class="label">Odobrio</div><div class="line">&nbsp;</div></div></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!data) return <Text type="secondary">Nema podataka</Text>;

  const columns = [
    {
      title: 'Datum',
      dataIndex: 'date',
      key: 'date',
      render: (v) => (v ? dayjs(v).format('DD.MM.YYYY') : '–'),
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v) => v || '–',
    },
    {
      title: 'Duguje',
      dataIndex: 'duguje',
      key: 'duguje',
      align: 'right',
      render: (v) => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          <Text type={Number(v) > 0 ? 'danger' : undefined}>{fmtMoney(v)}</Text>
        </span>
      ),
    },
    {
      title: 'Potražuje',
      dataIndex: 'potrazuje',
      key: 'potrazuje',
      align: 'right',
      render: (v) => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          <Text type={Number(v) > 0 ? 'success' : undefined}>{fmtMoney(v)}</Text>
        </span>
      ),
    },
  ];

  const total = Number(data.total);

  return (
    <>
      <ExemptionSection memberId={memberId} />
      <div style={{ marginBottom: 16 }}>
        <Text strong>Napomena</Text>
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Interna napomena o stomatologu"
          maxLength={5000}
          style={{ marginTop: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button
            type="primary"
            size="small"
            loading={updateNapomena.isPending}
            onClick={handleSaveNote}
          >
            Sačuvaj napomenu
          </Button>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Button
          type="default"
          icon={<DownloadOutlined />}
          onClick={handleDownloadPdf}
          loading={pdfLoading}
          disabled={!data?.records?.length}
          style={{ borderRadius: 8, minWidth: 120 }}
        >
          Preuzmi (PDF)
        </Button>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          style={{ borderRadius: 8, minWidth: 100 }}
        >
          Štampaj
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data.records || []}
        pagination={data.records?.length > 20 ? { pageSize: 20, size: 'small' } : false}
        size="small"
        bordered
        locale={{ emptyText: 'Nema stavki' }}
      />
      <div
        style={{
          marginTop: 16,
          padding: '14px 20px',
          background: total > 0 ? '#fff2f0' : total < 0 ? '#f6ffed' : '#fafafa',
          border: `1px solid ${total > 0 ? '#ffccc7' : total < 0 ? '#b7eb8f' : '#f0f0f0'}`,
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Text
          strong
          style={{
            fontSize: 16,
            color: total > 0 ? '#cf1322' : total < 0 ? '#389e0d' : undefined,
          }}
        >
          Ukupno: {fmtMoney(data.total)} €
        </Text>
      </div>
    </>
  );
}

/* ───── Main Page ───── */
export default function FinanceListPage() {
  const deleteFinance = useDeleteFinance();
  const addFinance = useAddFinance();
  const updateFinance = useUpdateFinance();

  // Server-side paginacija + filteri
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [searchInput, setSearchInput] = useState(''); // ono sto korisnik kuca
  const [search, setSearch] = useState('');           // debounce-ovana vrijednost koja ide na server
  const [memberFilter, setMemberFilter] = useState('all');
  const [updatedByFilter, setUpdatedByFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ visible: false, item: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [detailsMemberId, setDetailsMemberId] = useState(null);
  const [detailsMemberName, setDetailsMemberName] = useState('');
  const [form] = Form.useForm();

  // Debounce pretrage (400ms); svaka promjena vraca na prvu stranu
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Parametri za /finances – uvijek sa page (server-side paginacija)
  const queryParams = useMemo(() => {
    const params = { page, per_page: perPage };
    if (search) params.search = search;
    if (memberFilter !== 'all') params.user_id = memberFilter;
    if (updatedByFilter !== 'all') params.updated_by = updatedByFilter;
    return params;
  }, [page, perPage, search, memberFilter, updatedByFilter]);

  const { data: financesResp, isLoading, isFetching, error } = useFinances(queryParams);
  const finances = Array.isArray(financesResp?.data) ? financesResp.data : [];
  const totalCount = financesResp?.total ?? finances.length;

  // Opcije za dropdown: clanovi iz /member, obradjivaci iz /finances/processors
  const { data: members = [] } = useMembers();
  const { data: processors = [] } = useFinanceProcessors();

  // Mjesecni izvjestaj o clanarini (CSV za knjigovodstvenu agenciju)
  const { data: reportPeriods = [] } = useReportPeriods();
  const [reportPeriod, setReportPeriod] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Podrazumijevano najnoviji mjesec, da se ne bira rucno u najcescem slucaju
  useEffect(() => {
    if (!reportPeriod && reportPeriods.length) setReportPeriod(reportPeriods[0]);
  }, [reportPeriods, reportPeriod]);

  const handleDownloadReport = async () => {
    if (!reportPeriod) return;
    setReportLoading(true);
    try {
      const blob = await financesApi.downloadMonthlyReport(reportPeriod);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clanarina_${reportPeriod.replace('-', '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success(`Izvještaj za ${reportPeriod} je preuzet`);
    } catch (e) {
      message.error('Preuzimanje izvještaja nije uspjelo. Pokušajte ponovo.');
    } finally {
      setReportLoading(false);
    }
  };

  const { data: editingItem, isLoading: loadingItem } = useFinance(editingId);

  useEffect(() => {
    if (!editingItem || drawerMode !== 'edit') return;
    form.setFieldsValue({
      member_id: editingItem.user_id ?? editingItem.user?.id ?? editingItem.member_id ?? editingItem.member?.id,
      date: editingItem.date ? dayjs(editingItem.date) : null,
      duguje: Number(editingItem.duguje),
      potrazuje: Number(editingItem.potrazuje),
      description: editingItem.description ?? '',
    });
  }, [editingItem, drawerMode, form]);

  const memberFilterOptions = useMemo(() => {
    const opts = (Array.isArray(members) ? members : [])
      .map((m) => ({ value: m.id, label: `${m.name || ''} ${m.surname || ''}`.trim() }))
      .filter((o) => o.value != null && o.label)
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: 'all', label: 'Svi članovi' }, ...opts];
  }, [members]);

  const updatedByFilterOptions = useMemo(() => {
    const opts = (Array.isArray(processors) ? processors : [])
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
    return [{ value: 'all', label: 'Svi obrađivači' }, ...opts];
  }, [processors]);

  const onMemberFilterChange = (v) => { setMemberFilter(v); setPage(1); };
  const onUpdatedByFilterChange = (v) => { setUpdatedByFilter(v); setPage(1); };

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

  const openDetails = (record) => {
    const user = record.user || record.member; // Support both user (new) and member (legacy)
    const memberId = record.user_id ?? user?.id ?? record.member_id;
    const name = user
      ? `${user.name || ''} ${user.surname || ''}`.trim()
      : '';
    setDetailsMemberId(memberId);
    setDetailsMemberName(name);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleDelete = async () => {
    if (!deleteModal.item?.id) return;
    try {
      await deleteFinance.mutateAsync(deleteModal.item.id);
      message.success('Stavka je obrisana');
      setDeleteModal({ visible: false, item: null });
    } catch (e) {
      message.error(e?.message || 'Greška pri brisanju');
    }
  };

  const onFormFinish = async (values) => {
    try {
      const payload = {
        user_id: values.member_id, // member_id from form is actually user_id now
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : null,
        duguje: values.duguje ?? 0,
        potrazuje: values.potrazuje ?? 0,
        description: values.description?.trim() || null,
      };
      if (drawerMode === 'add') {
        await addFinance.mutateAsync(payload);
        message.success('Stavka je dodana');
      } else {
        await updateFinance.mutateAsync({ id: editingId, ...payload });
        message.success('Stavka je ažurirana');
      }
      closeDrawer();
    } catch (e) {
      message.error(e?.message || 'Greška');
    }
  };

  const columns = [
    {
      title: 'Datum',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => (v ? dayjs(v).format('DD.MM.YYYY') : '–'),
    },
    {
      title: 'Član',
      key: 'user',
      width: 160,
      ellipsis: true,
      render: (_, r) => {
        const user = r.user || r.member; // Support both user (new) and member (legacy)
        return user ? `${user.name || ''} ${user.surname || ''}`.trim() : '–';
      },
    },
    {
      title: 'Br. licence',
      key: 'licence',
      width: 120,
      ellipsis: true,
      render: (_, r) => licenseOf(r.user || r.member) || '–',
    },
    {
      title: 'Opis',
      dataIndex: 'description',
      key: 'description',
      width: 180,
      ellipsis: true,
      responsive: ['lg'],
      render: (v) => v || '–',
    },
    {
      title: 'Obradio/la',
      dataIndex: 'updated_by_name',
      key: 'updated_by_name',
      width: 160,
      ellipsis: true,
      responsive: ['lg'],
      render: (v) => v || '–',
    },
    {
      title: 'Duguje',
      dataIndex: 'duguje',
      key: 'duguje',
      width: 100,
      align: 'right',
      responsive: ['md'],
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ display: 'block', textAlign: 'right' }}>
            {n > 0 ? <Tag color="red">{fmtMoney(n)}</Tag> : fmtMoney(n)}
          </span>
        );
      },
    },
    {
      title: 'Potražuje',
      dataIndex: 'potrazuje',
      key: 'potrazuje',
      width: 100,
      align: 'right',
      responsive: ['md'],
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ display: 'block', textAlign: 'right' }}>
            {n > 0 ? <Tag color="green">{fmtMoney(n)}</Tag> : fmtMoney(n)}
          </span>
        );
      },
    },
    {
      title: 'Ukupno',
      key: 'total',
      width: 100,
      align: 'right',
      render: (_, r) => {
        const t = Number(r.duguje) - Number(r.potrazuje);
        return (
          <Text strong style={{ color: t > 0 ? '#cf1322' : t < 0 ? '#389e0d' : undefined }}>
            {fmtMoney(t)}
          </Text>
        );
      },
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetails(record)}
            title="Detalji"
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditDrawer(record)}
            title="Izmijeni"
          />
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

  const formLoading = addFinance.isPending || updateFinance.isPending;
  const drawerContent =
    drawerMode === 'edit' && loadingItem ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    ) : (
      <FinanceForm
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
          Finansije
        </Text>
        <Space wrap size="small">
          <Select
            value={memberFilter}
            onChange={onMemberFilterChange}
            style={{ width: 180 }}
            options={memberFilterOptions}
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={updatedByFilter}
            onChange={onUpdatedByFilterChange}
            style={{ width: 180 }}
            options={updatedByFilterOptions}
            showSearch
            optionFilterProp="label"
          />
          <Search
            placeholder="Pretraga..."
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={(v) => { setSearch(v.trim()); setPage(1); }}
            style={{ width: 220, minWidth: 160 }}
          />
          {reportPeriods.length > 0 && (
            <Space.Compact>
              <Select
                value={reportPeriod}
                onChange={setReportPeriod}
                style={{ width: 120 }}
                options={reportPeriods.map((p) => ({ value: p, label: p }))}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadReport}
                loading={reportLoading}
                title="CSV izvještaj o članarini za izabrani mjesec — za knjigovodstvenu agenciju"
              >
                Izvještaj
              </Button>
            </Space.Compact>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddDrawer}>
            Dodaj stavku
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={finances}
        loading={isLoading || isFetching}
        pagination={{
          current: page,
          pageSize: perPage,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: [15, 25, 50, 100],
          showTotal: (t) => `Ukupno: ${t}`,
          size: 'default',
        }}
        onChange={(pag) => {
          setPage(pag.current);
          setPerPage(pag.pageSize);
        }}
        size="middle"
        locale={{ emptyText: error ? 'Greška pri učitavanju' : 'Nema stavki' }}
        onRow={(record) => ({
          onClick: (e) => {
            // Don't open details when clicking action buttons
            if (e.target.closest('button') || e.target.closest('a')) return;
            openDetails(record);
          },
          style: { cursor: 'pointer' },
        })}
      />

      {/* Delete modal */}
      <Modal
        title="Potvrda brisanja"
        open={deleteModal.visible}
        onOk={handleDelete}
        onCancel={() => setDeleteModal({ visible: false, item: null })}
        okText="Obriši"
        cancelText="Odustani"
        confirmLoading={deleteFinance.isPending}
        okButtonProps={{ danger: true }}
      >
        Da li ste sigurni da želite obrisati ovu stavku?
      </Modal>

      {/* Add / Edit drawer */}
      <Drawer
        title={drawerMode === 'add' ? 'Dodaj stavku' : 'Izmijeni stavku'}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {drawerContent}
      </Drawer>

      {/* Member details drawer */}
      <Drawer
        title={`Detalji – ${detailsMemberName || 'Član'}`}
        placement="right"
        width={560}
        open={!!detailsMemberId}
        onClose={() => setDetailsMemberId(null)}
        destroyOnClose
      >
        {detailsMemberId && (
          <MemberDetailsContent
            memberId={detailsMemberId}
            memberName={detailsMemberName}
          />
        )}
      </Drawer>
    </div>
  );
}
