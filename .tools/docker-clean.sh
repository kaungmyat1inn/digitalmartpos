#!/bin/bash

# =============================================================================
# Docker Cleanup Script
# Stops and removes containers, networks, images, and volumes for this project
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name (matches docker-compose.yml project_name)
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitalmartpos}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Docker Container Cleanup Script                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show status
status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info &> /dev/null; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Confirmation prompt
if [ "$1" != "--force" ]; then
    echo -e "${YELLOW}This will remove all Docker resources for project: ${PROJECT_NAME}${NC}"
    echo -e "${YELLOW}Including containers, networks, images, and volumes!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
fi

status "Starting Docker cleanup for project: ${PROJECT_NAME}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Stop and remove containers
# -----------------------------------------------------------------------------
status "Step 1: Stopping and removing containers..."

# Get all containers for this project
CONTAINERS=$(docker ps -a --filter "name=${PROJECT_NAME}" -q 2>/dev/null || true)

if [ -n "$CONTAINERS" ]; then
    docker stop $CONTAINERS 2>/dev/null || true
    docker rm $CONTAINERS 2>/dev/null || true
    success "Containers stopped and removed"
else
    warning "No containers found for project: ${PROJECT_NAME}"
fi

# -----------------------------------------------------------------------------
# Step 2: Remove project-specific networks
# -----------------------------------------------------------------------------
status "Step 2: Removing project networks..."

NETWORKS=$(docker network ls --filter "name=${PROJECT_NAME}" -q 2>/dev/null || true)

if [ -n "$NETWORKS" ]; then
    for NET in $NETWORKS; do
        docker network rm $NET 2>/dev/null || true
    done
    success "Project networks removed"
else
    warning "No project networks found"
fi

# -----------------------------------------------------------------------------
# Step 3: Remove project-specific volumes
# -----------------------------------------------------------------------------
status "Step 3: Removing project volumes..."

VOLUMES=$(docker volume ls --filter "name=${PROJECT_NAME}" -q 2>/dev/null || true)

if [ -n "$VOLUMES" ]; then
    for VOL in $VOLUMES; do
        docker volume rm $VOL 2>/dev/null || true
    done
    success "Project volumes removed"
else
    warning "No project volumes found"
fi

# -----------------------------------------------------------------------------
# Step 4: Remove project-specific images
# -----------------------------------------------------------------------------
status "Step 4: Removing project images..."

IMAGES=$(docker images --filter "reference=${PROJECT_NAME}*" -q 2>/dev/null || true)

if [ -n "$IMAGES" ]; then
    docker rmi -f $IMAGES 2>/dev/null || true
    success "Project images removed"
else
    warning "No project images found"
fi

# -----------------------------------------------------------------------------
# Step 5: Cleanup dangling images (optional)
# -----------------------------------------------------------------------------
if [ "$2" == "--full" ] || [ "$2" == "-f" ]; then
    status "Step 5: Cleaning up dangling images and build cache..."
    
    # Remove dangling images
    DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null || true)
    if [ -n "$DANGLING" ]; then
        docker rmi $DANGLING 2>/dev/null || true
    fi
    
    # Clear build cache
    docker builder prune -f 2>/dev/null || true
    
    success "Build cache cleaned up"
fi

# -----------------------------------------------------------------------------
# Final cleanup: system prune (optional)
# -----------------------------------------------------------------------------
if [ "$2" == "--system" ] || [ "$2" == "-s" ]; then
    status "Running system-wide cleanup..."
    docker system prune -f --volumes 2>/dev/null || true
    success "System-wide cleanup completed"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   Cleanup Complete!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Usage:"
echo "  ./docker-clean.sh           # Interactive cleanup"
echo "  ./docker-clean.sh --force   # Non-interactive cleanup"
echo "  ./docker-clean.sh --full   # Also clean build cache"
echo "  ./docker-clean.sh --system # Full system cleanup"
echo ""

# Show remaining resources for this project
REMAINING=$(docker ps -a --filter "name=${PROJECT_NAME}" -q 2>/dev/null | wc -l || echo "0")
if [ "$REMAINING" -gt 0 ]; then
    warning "Some containers may still exist. Run 'docker ps -a' to check."
else
    success "All project resources have been cleaned up!"
fi

exit 0

