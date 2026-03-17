package com.website.journey.backend.domain.navlayout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "nav_layout")
public class NavLayout {

    @Id
    @Column(name = "item_key")
    private String itemKey;

    @Column(nullable = false)
    private String zone;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "height_px")
    private Integer heightPx;

    @Column(name = "width_px")
    private Integer widthPx;

    @Column(name = "offset_x", nullable = false)
    private int offsetX;

    @Column(name = "offset_y", nullable = false)
    private int offsetY;

    public String getItemKey() { return itemKey; }
    public void setItemKey(String itemKey) { this.itemKey = itemKey; }

    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Integer getHeightPx() { return heightPx; }
    public void setHeightPx(Integer heightPx) { this.heightPx = heightPx; }

    public Integer getWidthPx() { return widthPx; }
    public void setWidthPx(Integer widthPx) { this.widthPx = widthPx; }

    public int getOffsetX() { return offsetX; }
    public void setOffsetX(int offsetX) { this.offsetX = offsetX; }

    public int getOffsetY() { return offsetY; }
    public void setOffsetY(int offsetY) { this.offsetY = offsetY; }
}
