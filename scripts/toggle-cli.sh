#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_NAME="@codika-io/helper-sdk"
LINKED_PROJECTS_FILE="$PROJECT_DIR/.linked-projects"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Codika directory (parent of this SDK)
CODIKA_DIR="$(dirname "$PROJECT_DIR")"

# Default projects to link (can be overridden by .linked-projects file)
# Automatically detects sibling project codika-processes-lib
DEFAULT_PROJECTS=()
if [ -d "$CODIKA_DIR/codika-processes-lib" ]; then
    DEFAULT_PROJECTS+=("$CODIKA_DIR/codika-processes-lib")
fi

get_linked_projects() {
    if [ -f "$LINKED_PROJECTS_FILE" ]; then
        cat "$LINKED_PROJECTS_FILE"
    elif [ ${#DEFAULT_PROJECTS[@]} -gt 0 ]; then
        printf '%s\n' "${DEFAULT_PROJECTS[@]}"
    fi
}

save_linked_projects() {
    printf '%s\n' "$@" > "$LINKED_PROJECTS_FILE"
}

is_local_mode() {
    # Check if any dependent project has the SDK symlinked to our local dev version
    while IFS= read -r project; do
        if [ -n "$project" ] && [ -d "$project" ]; then
            LOCAL_MODULE="$project/node_modules/$PACKAGE_NAME"
            if [ -L "$LOCAL_MODULE" ]; then
                LINK_TARGET=$(readlink "$LOCAL_MODULE" 2>/dev/null)
                if [[ "$LINK_TARGET" == *"codika-helper-sdk"* ]]; then
                    return 0
                fi
            fi
        fi
    done < <(get_linked_projects)

    return 1
}

show_status() {
    echo -e "${BOLD}Current codika-helper location:${NC}"
    LOCATION=$(which codika-helper 2>/dev/null)
    if [ -n "$LOCATION" ]; then
        echo -e "  ${CYAN}$LOCATION${NC}"
    else
        echo -e "  ${RED}Not installed${NC}"
    fi
    echo ""

    echo -e "${BOLD}Version:${NC}"
    VERSION=$(codika-helper --version 2>/dev/null)
    if [ -n "$VERSION" ]; then
        echo -e "  ${CYAN}$VERSION${NC}"
    else
        echo -e "  ${RED}N/A${NC}"
    fi
    echo ""

    echo -e "${BOLD}Source:${NC}"
    if is_local_mode; then
        echo -e "  ${YELLOW}LOCAL${NC} (development version)"
    else
        echo -e "  ${GREEN}PUBLIC${NC} (npm registry or Homebrew)"
    fi
    echo ""

    # Show linked projects
    echo -e "${BOLD}Linked projects:${NC}"
    local has_projects=false
    while IFS= read -r project; do
        if [ -n "$project" ]; then
            has_projects=true
            if [ -d "$project/node_modules/$PACKAGE_NAME" ]; then
                # Check if it's actually linked to local
                if [ -L "$project/node_modules/$PACKAGE_NAME" ]; then
                    echo -e "  ${GREEN}✓${NC} $project"
                else
                    echo -e "  ${YELLOW}○${NC} $project (installed, not linked)"
                fi
            else
                echo -e "  ${RED}✗${NC} $project (not installed)"
            fi
        fi
    done < <(get_linked_projects)

    if [ "$has_projects" = false ]; then
        echo -e "  ${YELLOW}(none)${NC} - Use '$0 add <path>' to add projects"
    fi
}

link_projects() {
    echo -e "${BLUE}Linking SDK in dependent projects...${NC}"
    while IFS= read -r project; do
        if [ -n "$project" ] && [ -d "$project" ]; then
            echo -e "  Linking in ${CYAN}$project${NC}..."
            (cd "$project" && npm link "$PACKAGE_NAME" 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo -e "    ${GREEN}✓${NC} Linked successfully"
            else
                echo -e "    ${RED}✗${NC} Failed to link"
            fi
        fi
    done < <(get_linked_projects)
}

unlink_projects() {
    echo -e "${BLUE}Unlinking SDK from dependent projects...${NC}"
    while IFS= read -r project; do
        if [ -n "$project" ] && [ -d "$project" ]; then
            echo -e "  Unlinking from ${CYAN}$project${NC}..."
            (cd "$project" && npm unlink "$PACKAGE_NAME" 2>/dev/null && npm install "$PACKAGE_NAME" 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo -e "    ${GREEN}✓${NC} Reinstalled from npm"
            else
                echo -e "    ${YELLOW}○${NC} May need manual npm install"
            fi
        fi
    done < <(get_linked_projects)
}

use_local() {
    echo -e "${YELLOW}${BOLD}Switching to LOCAL version...${NC}"
    echo ""

    # Build first
    echo -e "${BLUE}Building project...${NC}"
    cd "$PROJECT_DIR" && npm run build

    if [ $? -ne 0 ]; then
        echo -e "${RED}${BOLD}Build failed!${NC}"
        exit 1
    fi

    # npm link globally - this creates the global link and bin
    echo ""
    echo -e "${BLUE}Linking globally via npm...${NC}"
    npm link

    # Link in dependent projects
    echo ""
    link_projects

    echo ""
    echo -e "${GREEN}${BOLD}Done!${NC} Now using LOCAL version."
    echo ""
    show_status
}

use_public() {
    echo -e "${GREEN}${BOLD}Switching to PUBLIC version...${NC}"
    echo ""

    # Unlink from dependent projects first
    unlink_projects
    echo ""

    # Unlink global
    echo -e "${BLUE}Unlinking global version...${NC}"
    npm unlink -g "$PACKAGE_NAME" 2>/dev/null

    # Install from npm globally
    echo -e "${BLUE}Installing from npm globally...${NC}"
    npm install -g "$PACKAGE_NAME"

    echo ""
    echo -e "${GREEN}${BOLD}Done!${NC} Now using PUBLIC version."
    echo ""
    show_status
}

add_project() {
    local new_project="$1"

    if [ -z "$new_project" ]; then
        echo -e "${RED}Error: Please provide a project path${NC}"
        exit 1
    fi

    # Resolve to absolute path
    new_project="$(cd "$new_project" 2>/dev/null && pwd)"

    if [ ! -d "$new_project" ]; then
        echo -e "${RED}Error: Directory does not exist: $new_project${NC}"
        exit 1
    fi

    # Get current projects
    mapfile -t projects < <(get_linked_projects)

    # Check if already exists
    for p in "${projects[@]}"; do
        if [ "$p" = "$new_project" ]; then
            echo -e "${YELLOW}Project already in list: $new_project${NC}"
            return
        fi
    done

    # Add new project
    projects+=("$new_project")
    save_linked_projects "${projects[@]}"

    echo -e "${GREEN}Added project: $new_project${NC}"

    # If in local mode, link it now
    if is_local_mode; then
        echo -e "${BLUE}Linking SDK in project...${NC}"
        (cd "$new_project" && npm link "$PACKAGE_NAME")
    fi
}

remove_project() {
    local rem_project="$1"

    if [ -z "$rem_project" ]; then
        echo -e "${RED}Error: Please provide a project path${NC}"
        exit 1
    fi

    # Resolve to absolute path if it exists
    if [ -d "$rem_project" ]; then
        rem_project="$(cd "$rem_project" && pwd)"
    fi

    # Get current projects and filter out the one to remove
    mapfile -t projects < <(get_linked_projects)
    new_projects=()
    found=false

    for p in "${projects[@]}"; do
        if [ "$p" = "$rem_project" ]; then
            found=true
        else
            new_projects+=("$p")
        fi
    done

    if [ "$found" = true ]; then
        save_linked_projects "${new_projects[@]}"
        echo -e "${GREEN}Removed project: $rem_project${NC}"
    else
        echo -e "${YELLOW}Project not in list: $rem_project${NC}"
    fi
}

rebuild() {
    echo -e "${BLUE}${BOLD}Rebuilding and relinking...${NC}"
    echo ""

    # Build
    echo -e "${BLUE}Building project...${NC}"
    cd "$PROJECT_DIR" && npm run build

    if [ $? -ne 0 ]; then
        echo -e "${RED}${BOLD}Build failed!${NC}"
        exit 1
    fi

    # Relink projects if in local mode
    if is_local_mode; then
        echo ""
        link_projects
    fi

    echo ""
    echo -e "${GREEN}${BOLD}Done!${NC}"
}

case "$1" in
    local)
        use_local
        ;;
    public)
        use_public
        ;;
    status)
        show_status
        ;;
    rebuild)
        rebuild
        ;;
    add)
        add_project "$2"
        ;;
    remove)
        remove_project "$2"
        ;;
    *)
        echo -e "${BOLD}Usage:${NC} $0 {local|public|status|rebuild|add|remove}"
        echo ""
        echo -e "${BOLD}Commands:${NC}"
        echo -e "  ${YELLOW}local${NC}    - Switch to local development version (builds and links all projects)"
        echo -e "  ${GREEN}public${NC}   - Switch to public npm package (unlinks and reinstalls)"
        echo -e "  ${CYAN}status${NC}   - Show current version info and linked projects"
        echo -e "  ${BLUE}rebuild${NC}  - Rebuild and relink (use after code changes)"
        echo ""
        echo -e "${BOLD}Project management:${NC}"
        echo -e "  ${CYAN}add${NC} <path>     - Add a project to auto-link list"
        echo -e "  ${CYAN}remove${NC} <path>  - Remove a project from auto-link list"
        echo ""
        echo -e "${BOLD}Example:${NC}"
        echo -e "  $0 local              # Switch to local dev version"
        echo -e "  $0 rebuild            # Rebuild after making changes"
        echo -e "  $0 add ../my-project  # Add a project to link"
        echo -e "  $0 public             # Switch back to npm version"
        exit 1
        ;;
esac
