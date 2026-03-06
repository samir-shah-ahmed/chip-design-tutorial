// Simple FIFO to verify
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
  // TODO: instantiate the FIFO and write a self-checking testbench
  // Test: push until full, pop until empty, verify data ordering
  initial begin
    $display("Write your FIFO testbench here!");
    $finish;
  end
endmodule
