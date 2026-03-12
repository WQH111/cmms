import { useEffect, useMemo, useRef, useState } from 'react';
import type { TreeNode } from '../types/TreeNode';
import { getAllNodes } from '../services/treeService';
import { compareTreeNodes } from '../utils/treeSort';
import previewStyles from './HierarchyPrintPreview.css?raw';
import './HierarchyPrintPreview.css';

interface HierarchyPrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrintableNode extends TreeNode {
  children: PrintableNode[];
}

type PrintLayoutMode = 'cards' | 'chart';

function buildPrintableTree(nodes: TreeNode[]): PrintableNode[] {
  const nodeMap = new Map<string, PrintableNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, {
      ...node,
      children: [],
    });
  }

  const roots: PrintableNode[] = [];

  for (const node of nodes) {
    const printableNode = nodeMap.get(node.id);
    if (!printableNode) continue;

    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(printableNode);
        continue;
      }
    }

    roots.push(printableNode);
  }

  const sortNodes = (items: PrintableNode[]) => {
    items.sort(compareTreeNodes);

    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function getTreeStats(nodes: TreeNode[]) {
  return {
    totalNodes: nodes.length,
    rootCount: nodes.filter((node) => !node.parentId).length,
    maxLevel: nodes.reduce((max, node) => Math.max(max, node.level), 0),
  };
}

function TreeBranch({ nodes }: { nodes: PrintableNode[] }) {
  return (
    <ul className="print-tree-list">
      {nodes.map((node) => (
        <li key={node.id} className="print-tree-item">
          <div className="print-tree-row">
            <span className="print-level-badge">L{node.level}</span>
            <span className="print-node-name">{node.name}</span>
            {node.code ? <span className="print-node-code">{node.code}</span> : null}
          </div>
          {node.children.length > 0 ? <TreeBranch nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

function ChartBranch({ nodes }: { nodes: PrintableNode[] }) {
  return (
    <div className="print-chart-column">
      {nodes.map((node) => (
        <div key={node.id} className="print-chart-node-group">
          <div className="print-chart-node-card">
            <div className="print-chart-node-main">
              <span className="print-node-name">{node.name}</span>
              {node.code ? <span className="print-node-code">{node.code}</span> : null}
            </div>
            <span className="print-level-badge print-level-badge-outline">L{node.level}</span>
          </div>

          {node.children.length > 0 ? (
            <div className="print-chart-children-wrap">
              <div className="print-chart-horizontal-link" />
              <div className="print-chart-children">
                <ChartBranch nodes={node.children} />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function HierarchyPrintPreview({ isOpen, onClose }: HierarchyPrintPreviewProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>('cards');
  const [chartPreviewScale, setChartPreviewScale] = useState(1);
  const [chartPrintScale, setChartPrintScale] = useState(1);
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const chartCanvasRef = useRef<HTMLDivElement | null>(null);
  const standardSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadNodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const allNodes = await getAllNodes();
        if (!cancelled) {
          setNodes(allNodes);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNodes();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || layoutMode !== 'chart' || nodes.length === 0) {
      setChartPreviewScale(1);
      setChartPrintScale(1);
      return;
    }

    const calculateChartScale = () => {
      const chartViewport = chartViewportRef.current;
      const chartCanvas = chartCanvasRef.current;
      if (!chartCanvas) return;

      const contentWidth = chartCanvas.scrollWidth;
      const contentHeight = chartCanvas.scrollHeight;

      if (!contentWidth || !contentHeight) {
        setChartPreviewScale(1);
        setChartPrintScale(1);
        return;
      }

      if (chartViewport) {
        const viewportWidth = Math.max(chartViewport.clientWidth - 24, 0);
        const viewportHeight = Math.max(chartViewport.clientHeight - 24, 0);
        const previewWidthScale = viewportWidth / contentWidth;
        const previewHeightScale = viewportHeight / contentHeight;
        const previewScale = Math.min(previewWidthScale, previewHeightScale, 1);
        setChartPreviewScale(Number(Math.max(previewScale, 0.16).toFixed(3)));
      } else {
        setChartPreviewScale(1);
      }

      // Approximate printable area for A3 landscape after margins.
      const targetWidth = 1450;
      const targetHeight = 980;
      const widthScale = targetWidth / contentWidth;
      const heightScale = targetHeight / contentHeight;
      const nextScale = Math.min(widthScale, heightScale, 1);

      setChartPrintScale(Number(Math.max(nextScale, 0.18).toFixed(3)));
    };

    const frameId = window.requestAnimationFrame(calculateChartScale);
    window.addEventListener('resize', calculateChartScale);
    window.addEventListener('beforeprint', calculateChartScale);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', calculateChartScale);
      window.removeEventListener('beforeprint', calculateChartScale);
    };
  }, [isOpen, layoutMode, nodes]);

  const printableTree = useMemo(() => buildPrintableTree(nodes), [nodes]);
  const stats = useMemo(() => getTreeStats(nodes), [nodes]);

  const exportCurrentViewAsSvg = async () => {
    const targetElement =
      layoutMode === 'chart' ? chartCanvasRef.current : standardSectionRef.current;

    if (!targetElement) {
      alert('No preview content available to export.');
      return;
    }

    setExportingImage(true);

    try {
      const clonedNode = targetElement.cloneNode(true) as HTMLElement;

      if (layoutMode === 'chart') {
        clonedNode.style.position = 'static';
        clonedNode.style.top = '0';
        clonedNode.style.left = '0';
        clonedNode.style.transform = 'none';
      }

      const width = Math.ceil(targetElement.scrollWidth || targetElement.clientWidth || 1);
      const height = Math.ceil(targetElement.scrollHeight || targetElement.clientHeight || 1);

      const wrapperClass =
        layoutMode === 'chart'
          ? 'png-export-wrapper png-export-wrapper-chart'
          : 'png-export-wrapper png-export-wrapper-standard';

      const svgMarkup = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" class="${wrapperClass}">
              <style>${previewStyles}</style>
              ${clonedNode.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const { save } = await import('@tauri-apps/plugin-dialog');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const suggestedName = `CMMS_Hierarchy_${layoutMode}_${timestamp}.svg`;

      const filePath = await save({
        defaultPath: suggestedName,
        filters: [
          {
            name: 'SVG Image',
            extensions: ['svg'],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const imageBuffer = await svgBlob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(imageBuffer));

      alert(`Successfully exported image to:\n${filePath}`);
    } catch (err) {
      console.error('Image export failed:', err);
      alert(`Image export failed: ${err}`);
    } finally {
      setExportingImage(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="print-preview-overlay"
      role="dialog"
      aria-modal="true"
      data-layout-mode={layoutMode}
      style={{ ['--chart-print-scale' as string]: String(chartPrintScale) }}
    >
      <div className="print-preview-dialog">
        <div className="print-preview-toolbar">
          <div>
            <h2 className="print-preview-title">Hierarchy Print Preview</h2>
            <p className="print-preview-subtitle">
              Print the full tree structure, then choose Save as PDF in the system print dialog.
            </p>
          </div>
          <div className="print-preview-actions">
            <div className="print-layout-switch" role="group" aria-label="Print layout">
              <button
                type="button"
                className={`btn btn-layout ${layoutMode === 'cards' ? 'btn-layout-active' : ''}`}
                onClick={() => setLayoutMode('cards')}
              >
                Standard
              </button>
              <button
                type="button"
                className={`btn btn-layout ${layoutMode === 'chart' ? 'btn-layout-active' : ''}`}
                onClick={() => setLayoutMode('chart')}
              >
                Chart
              </button>
            </div>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-export-image"
              onClick={() => void exportCurrentViewAsSvg()}
              disabled={loading || !!error || nodes.length === 0 || exportingImage}
            >
              {exportingImage ? 'Exporting SVG...' : 'Export SVG'}
            </button>
            <button
              type="button"
              className="btn btn-print"
              onClick={() => window.print()}
              disabled={loading || !!error || nodes.length === 0}
            >
              Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="print-preview-body">
          {loading ? (
            <div className="print-preview-state">Loading full hierarchy...</div>
          ) : null}
          {!loading && error ? (
            <div className="print-preview-state print-preview-state-error">{error}</div>
          ) : null}
          {!loading && !error && nodes.length === 0 ? (
            <div className="print-preview-state">No nodes available for printing.</div>
          ) : null}
          {!loading && !error && nodes.length > 0 ? (
            <div className={`print-document print-document-${layoutMode}`}>
              <header className="print-document-header">
                <div>
                  <h1>CMMS Hierarchy Report</h1>
                  <p>Generated from the current database snapshot.</p>
                </div>
                <div className="print-document-meta">
                  <span>
                    Layout: {layoutMode === 'cards' ? 'Standard' : 'Chart'}
                  </span>
                  {layoutMode === 'chart' ? <span>Fit Scale: {Math.round(chartPrintScale * 100)}%</span> : null}
                  <span>Total Nodes: {stats.totalNodes}</span>
                  <span>Root Nodes: {stats.rootCount}</span>
                  <span>Max Level: {stats.maxLevel}</span>
                </div>
              </header>

              <section className="print-document-section">
                {layoutMode === 'cards' ? (
                  <div ref={standardSectionRef}>
                    <TreeBranch nodes={printableTree} />
                  </div>
                ) : (
                  <div ref={chartViewportRef} className="print-chart-viewport">
                    <div
                      ref={chartCanvasRef}
                      className="print-chart-canvas"
                      style={{ transform: `scale(${chartPreviewScale})` }}
                    >
                      <ChartBranch nodes={printableTree} />
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
