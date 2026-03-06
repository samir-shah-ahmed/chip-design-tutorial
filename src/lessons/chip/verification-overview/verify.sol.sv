module fifo #(parameter DEPTH=4, WIDTH=8)(
  input                clk, reset,
  input                push, pop,
  input  [WIDTH-1:0]   data_in,
  output [WIDTH-1:0]   data_out,
  output               full, empty
);
  reg [WIDTH-1:0] mem [0:DEPTH-1];
  reg [$clog2(DEPTH):0] count;
  reg [$clog2(DEPTH)-1:0] rd_ptr, wr_ptr;

  assign data_out = mem[rd_ptr];
  assign full  = (count == DEPTH);
  assign empty = (count == 0);

  always @(posedge clk) begin
    if (reset) begin
      count <= 0; rd_ptr <= 0; wr_ptr <= 0;
    end else begin
      if (push && !full) begin
        mem[wr_ptr] <= data_in;
        wr_ptr <= wr_ptr + 1;
        count <= count + 1;
      end
      if (pop && !empty) begin
        rd_ptr <= rd_ptr + 1;
        count <= count - 1;
      end
    end
  end
endmodule

module top;
  reg clk, reset, push, pop;
  reg [7:0] data_in;
  wire [7:0] data_out;
  wire full, empty;

  fifo #(.DEPTH(4), .WIDTH(8)) dut (
    .clk(clk), .reset(reset),
    .push(push), .pop(pop),
    .data_in(data_in), .data_out(data_out),
    .full(full), .empty(empty)
  );

  initial clk = 0;
  always #5 clk = ~clk;

  initial begin
    reset = 1; push = 0; pop = 0; data_in = 0;
    #20; reset = 0;

    // Test 1: empty on reset
    if (!empty) begin $display("FAIL: not empty after reset"); $finish; end
    $display("PASS: empty after reset");

    // Test 2: push 4 items (fill the FIFO)
    @(negedge clk); push = 1; data_in = 8'hAA; @(negedge clk); data_in = 8'hBB;
    @(negedge clk); data_in = 8'hCC; @(negedge clk); data_in = 8'hDD;
    @(negedge clk); push = 0;
    if (!full) begin $display("FAIL: not full after 4 pushes"); $finish; end
    $display("PASS: full after 4 pushes");

    // Test 3: pop and check FIFO order
    @(negedge clk); pop = 1; @(posedge clk); #1;
    if (data_out !== 8'hAA) begin $display("FAIL: expected AA got %h", data_out); $finish; end
    @(negedge clk); @(posedge clk); #1;
    if (data_out !== 8'hBB) begin $display("FAIL: expected BB got %h", data_out); $finish; end
    @(negedge clk); pop = 0;

    $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
