'use strict';

import $ from 'jquery';

// 基础信息
let info = null;
let canvas = null;
let coordinate = null;


// 隐藏的元素
let hideGroups = {};
let hideEdges = {};
let hideNodes = {};

export default {
  // 初始化赋值
  init: (opts) => {
    info = opts.info;
    canvas = opts.canvas;
    coordinate = opts.coordinate;

    canvas.on('system.canvas.move', () => {
      _redraw();
    });
    canvas.on('system.canvas.zoom', () => {
      _redraw();
    });
  },
  // 向画布中添加线段
  addEdges: (edges, opts) => {
    let result = [];
    let {_edgeFragment, _labelFragment} = opts;
    edges.forEach((item) => {
      if (getEdgeVisibleStatus(item)) {
        item.virtualHidden = false;
        result.push(item);
      } else {
        item.virtualHidden = true;
        hideEdges[`${item.options.sourceNode}-${item.options.source}-${item.options.targetNode}-${item.options.target}`] = item;
        $(item.dom).detach();
        item.labelDom && $(item.labelDom).detach();
        item.arrowDom && $(item.arrowDom).detach();
        item.eventHandlerDom && $(item.eventHandlerDom).detach();
      }
    });
    return result;
  },
  // 向画布中删除节点组
  removeGroup: (group) => {
    delete hideGroups[group.id];
  },
  // 向画布中删除节点
  removeNodes: (data) => {
    data.nodes.forEach((item) => {
      delete hideNodes[item.id];
    });
    data.edges.forEach((item) => {
      delete hideEdges[`${item.options.sourceNode}-${item.options.source}-${item.options.targetNode}-${item.options.target}`];
    });
  },
  // 向画布中删除线段
  removeEdges: (edges) => {
    edges.forEach((item) => {
      delete hideEdges[`${item.options.sourceNode}-${item.options.source}-${item.options.targetNode}-${item.options.target}`];
    });
  },
  // 移动、缩放时重绘画布
  redraw: (isInit) => {
    redraw(isInit);
  },
  // 获取隐藏的节点组
  getHideGroups: () => {
    return hideGroups;
  },
  // 获取隐藏的节点
  getHideNodes: () => {
    return hideNodes;
  },
  // 获取隐藏的线段
  getHideEdges: () => {
    return hideEdges;
  }
}

// 防抖节流
let timer = null;
const _redraw = () => {
  if (timer) {
    return;
  } else {
    timer = setTimeout(() => {
      redraw();
      clearTimeout(timer);
      timer = null;
    }, 150);
  }

}

// 移动、缩放、初始化时重绘画布
let updatePosTimer = null;
const redraw = (isInit) => {

  canvas.groups.forEach((group) => {
    // 处理在节点组上的节点
    if (group.group) {
      return;
    }

    if (getNodeVisibleStatus(group)) {
      group.virtualHidden = false;
      $(group.dom).css('visibility', 'visible');
      if (hideGroups[group.id]) {
        delete hideGroups[group.id];
        $(canvas.wrapper).prepend(group.dom);
        group.endpoints.forEach((item) => {
          item.updatePos();
          let edges = canvas.getNeighborEdgesByEndpoint(group.id, item.id);
          edges.forEach((_edge) => {
            _edge.redraw();
          });
        });
        group.groups.forEach((item) => {
          delete hideGroups[item.id];
        });
        group.nodes.forEach((item) => {
          delete hideNodes[item.id];
        });
      }
    } else {
      if (!hideGroups[group.id]) {
        group.virtualHidden = true;
        $(group.dom).detach();
        hideGroups[group.id] = group;
        group.groups.forEach((item) => {
          hideGroups[item.id] = item;
        });
        group.nodes.forEach((item) => {
          hideNodes[item.id] = item;
        });
      }
    }
  });

  const _nodesFragment = document.createDocumentFragment();
  const _pointFragment = document.createDocumentFragment();
  // let _addNodes = [];
  canvas.nodes.forEach((node) => {
    // 处理在节点组上的节点
    if (node.group) {
      if (node._group.virtualHidden) {
        node.virtualHidden = true;
        hideNodes[node.id] = node;
      }
      return;
    }

    if (getNodeVisibleStatus(node)) {
      node.virtualHidden = false;
      $(node.dom).css('visibility', 'visible');
      if (hideNodes[node.id]) {
        delete hideNodes[node.id];
        _nodesFragment.appendChild(node.dom);
        node.endpoints.forEach((item) => {
          !item._isInitedDom && _pointFragment.appendChild(item.dom);
        });
        // _addNodes.push(node);
      }
    } else {
      if (!hideNodes[node.id]) {
        node.virtualHidden = true;
        $(node.dom).detach();
        node.endpoints.forEach((item) => {
          !item._isInitedDom && $(item.dom).detach();
        });
        hideNodes[node.id] = node;
      }
    }
  });

  $(canvas.wrapper).append(_nodesFragment);
  $(canvas.wrapper).prepend(_pointFragment);

  if (!isInit) {
    const _edgeFragment = document.createDocumentFragment();
    const _labelFragment = document.createDocumentFragment();

    canvas.edges.forEach((edge) => {
      if (getEdgeVisibleStatus(edge)) {
        edge.virtualHidden = false;
        if (hideEdges[`${edge.options.sourceNode}-${edge.options.source}-${edge.options.targetNode}-${edge.options.target}`]) {
          delete hideEdges[`${edge.options.sourceNode}-${edge.options.source}-${edge.options.targetNode}-${edge.options.target}`];
          _edgeFragment.appendChild(edge.dom);
          edge.eventHandlerDom && _edgeFragment.appendChild(edge.eventHandlerDom);
          edge.arrowDom && _edgeFragment.appendChild(edge.arrowDom);
          edge.labelDom && _labelFragment.appendChild(edge.labelDom);
        }
      } else {
        if (!hideEdges[`${edge.options.sourceNode}-${edge.options.source}-${edge.options.targetNode}-${edge.options.target}`]) {
          edge.virtualHidden = true;
          $(edge.dom).detach();
          edge.eventHandlerDom && $(edge.eventHandlerDom).detach();
          edge.labelDom && $(edge.labelDom).detach();
          edge.arrowDom && $(edge.arrowDom).detach();
          hideEdges[`${edge.options.sourceNode}-${edge.options.source}-${edge.options.targetNode}-${edge.options.target}`] = edge;
        }
      }
    });

    $(canvas.svg).append(_edgeFragment);
    $(canvas.wrapper).append(_labelFragment);
  }
  
  clearTimeout(updatePosTimer);
  updatePosTimer = setTimeout(() => {
    canvas.nodes.forEach((node) => {
      if (!hideNodes[node.id]) {
        node.endpoints.forEach((item) => {
          item.updatePos();
        });
      }
    });
  
    canvas.edges.forEach((edge) => {
      edge.redraw();
    });
  }, 300);
}

// 判断节点是否在可视区域
const getNodeVisibleStatus = (node) => {
  let x1 = node.left;
  let y1 = node.top;
  let x2 = node.left + node.getWidth(true);
  let y2 = node.top + node.getHeight(true);

  let top = coordinate.virtualScrollCoordinate.top;
  let bottom = coordinate.virtualScrollCoordinate.bottom;
  let left = coordinate.virtualScrollCoordinate.left;
  let right = coordinate.virtualScrollCoordinate.right;

  if (x1 > right || y1 > bottom || x2 < left || y2 < top) {
    return false;
  } else {
    return true;
  }
}

// 判断线段是否在可视区域
const getEdgeVisibleStatus = (edge) => {
  let top = coordinate.virtualScrollCoordinate.top;
  let bottom = coordinate.virtualScrollCoordinate.bottom;
  let left = coordinate.virtualScrollCoordinate.left;
  let right = coordinate.virtualScrollCoordinate.right;

  let source = edge._sourcePoint.pos;
  let target = edge._targetPoint.pos;
  let sourceInSide = source[0] >= left &&  source[0] <= right && source[1] >= top && source[1] <= bottom;
  let targetInSide = target[0] >= left &&  target[0] <= right && target[1] >= top && target[1] <= bottom;
  if (sourceInSide || targetInSide) {
    return true;
  } else {
    let info = edge._calcK();
    if (info.k === Infinity || info.k === 0) {
      // todo： 这两个判断不够完善，有可能有穿插的情况
      return  false;
    } else {
      // case1：以left为纬度
      let x1 = left;
      let y1 = info.k * left + info.a;
      // case2：以right为纬度
      let x2 = right;
      let y2 = info.k * right + info.a;
      // case3：以top为纬度
      let x3 = (top - info.a) / info.k;
      let y3 = top;
      // case4：以bottom为纬度
      let x4 = (bottom - info.a) / info.k;
      let y4 = bottom;


      if ((y1 < top || y1 > bottom) && (y2 < top || y2 > bottom) && (x3 < left || x3 > right) && (x4 < left || x4 > right)) {
        return false;
      }
    }
  }

  return true;
}

export const isHiddenNode = (id) => {
  return !!hideNodes[id];
}

export const isHiddenGroup = (id) => {
  return !!hideGroups[id];
}

export const isHiddenEdge = (id) => {
  return !!hideEdges[id];
}